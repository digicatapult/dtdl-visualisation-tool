import { DtdlObjectModel, EntityType, getInterop, ModelingException, parseDtdl } from '@digicatapult/dtdl-parser'
import { createHash } from 'crypto'
import { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path, { join, relative } from 'node:path'
import { container, inject, singleton } from 'tsyringe'
import unzipper from 'unzipper'
import z from 'zod'
import { DtdlFile } from '../../../db/types.js'
import { Env } from '../../env/index.js'
import { ModellingError, UploadError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import { dtdlObjectModelParser } from '../../models/dtdlOmParser.js'
import { Cache, type ICache } from '../cache.js'

export type DtdlPathFileEntryContent = {
  type: 'fileEntryContent'
  id: string
  name: string
  dtdlType: EntityType['EntityKind']
}
export type DtdlPathFileEntry = {
  type: 'fileEntry'
  name: string
  id: string
  dtdlType: EntityType['EntityKind']
  entries: DtdlPathFileEntryContent[]
}
type DtdlPathFile = {
  type: 'file'
  name: string
  entries: DtdlPathFileEntry[]
  errors?: ModelingException[]
}
type DtdlPathDirectory = {
  type: 'directory'
  name: string
  entries: DtdlPath[]
}
export type DtdlPath = DtdlPathDirectory | DtdlPathFile | DtdlPathFileEntry | DtdlPathFileEntryContent

const entityParser = z.object({
  '@id': z.string(),
})
type DtdlFileEntry = z.infer<typeof entityParser>
type DtdlFileContents = DtdlFileContents[] | DtdlFileEntry
const dtdlFileContentParser: z.ZodSchema<DtdlFileContents> = z.union([
  z.array(z.lazy(() => dtdlFileContentParser)),
  entityParser,
])

const env = container.resolve(Env)
@singleton()
export default class Parser {
  constructor(
    @inject(Logger) private logger: ILogger,
    @inject(Cache) private cache: ICache
  ) {}

  async getJsonFiles(dir: string, topDir?: string) {
    topDir = topDir || dir
    const entries = await readdir(dir, { withFileTypes: true })
    const files = await Promise.all(entries.map((entry) => this.handleFileOrDir(topDir, dir, entry)))
    return files.flat().filter((f) => f !== undefined)
  }

  private async handleFileOrDir(topDir: string, dir: string, entry: Dirent): Promise<DtdlFile[] | undefined> {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      return this.getJsonFiles(fullPath, topDir)
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      const contents = await readFile(fullPath, 'utf-8')
      const noBomJson = contents.replace(/^\uFEFF/, '')

      let json = {}
      try {
        json = JSON.parse(noBomJson) // Validate JSON
      } catch {
        this.logger.trace(`Ignoring invalid json: '${fullPath}'`)
        return
      }
      this.isWithinDepthLimit(json)
      return [{ path: relative(topDir, fullPath), contents: noBomJson }]
    }
  }

  async unzipJsonFiles(buffer: Buffer, subdir?: string): Promise<DtdlFile[]> {
    const directory = await unzipper.Open.buffer(buffer)

    const topDir = directory.files[0]
    if (!topDir || topDir.type !== 'Directory') throw new UploadError('Zip missing top-level directory')

    const uncompressedSize = { total: 0 }
    const files = await Promise.all(
      directory.files.map((entry) => this.handleUnzipFileOrDir(topDir.path, entry, uncompressedSize, subdir))
    )
    return files.flat().filter((f) => f !== undefined)
  }

  private async handleUnzipFileOrDir(
    topDir: string,
    file: unzipper.File,
    cumulativeSize: { total: number },
    subdir?: string
  ): Promise<DtdlFile[] | undefined> {
    if (subdir && !file.path.startsWith(join(topDir, subdir))) return

    if (file.type === 'File' && file.path.endsWith('.json')) {
      cumulativeSize.total += file.uncompressedSize
      if (cumulativeSize.total > env.get('UPLOAD_LIMIT_MB') * 1024 * 1024)
        throw new UploadError(`Uncompressed zip exceeds ${env.get('UPLOAD_LIMIT_MB')}MB limit`)

      const fileBuffer = await file.buffer()
      const contents = fileBuffer.toString().replace(/^\uFEFF/, '') // Remove BOM

      let json = {}
      try {
        json = JSON.parse(contents) // Validate JSON
      } catch {
        this.logger.trace(`Ignoring invalid json: '${file.path}'`)
        return
      }
      this.isWithinDepthLimit(json)
      return [{ path: relative(topDir, file.path), contents }]
    }
  }

  /**
   * Parses individual DTDL files and returns them with any parsing errors.
   * Ignores resolution errors.
   */
  async validate(files: DtdlFile[]): Promise<DtdlFile[]> {
    const parser = await getInterop()

    const filesWithErrors = files.map((file) => {
      const parsed = parseDtdl(file.contents, parser)
      return {
        ...file,
        ...(parsed.ExceptionKind === 'Parsing' && { errors: [parsed] }),
      }
    })

    if (filesWithErrors.every((f) => f.errors)) {
      throw new ModellingError(
        `All files have parsing errors. Open details of first file`,
        JSON.stringify(filesWithErrors[0]?.errors)
      )
    }

    return filesWithErrors
  }

  async parseAll(files: DtdlFile[]): Promise<DtdlObjectModel> {
    const parser = await getInterop()
    const allContents = Parser.fileContentsToString(files)

    const dtdlHashKey = createHash('sha256').update(allContents).digest('base64')
    if (this.cache.has(dtdlHashKey)) {
      const cachedParsedDtdl = this.cache.get(dtdlHashKey, dtdlObjectModelParser)
      if (cachedParsedDtdl) return cachedParsedDtdl
    }

    const parsedDtdl = parseDtdl(allContents, parser)

    if (parsedDtdl.ExceptionKind) {
      throw new ModellingError(
        `${parsedDtdl.ExceptionKind} error. Open details for more information`,
        JSON.stringify(parsedDtdl)
      )
    }
    this.cache.set<DtdlObjectModel>(dtdlHashKey, parsedDtdl)

    return parsedDtdl
  }

  extractDtdlPaths(files: DtdlFile[], model: DtdlObjectModel): DtdlPath[] {
    // for each file parse the contents and extract the entities along their file system path
    const dtdlFilePaths = files.map((file) => {
      const filePath = path.parse(file.path)
      if (file.errors)
        return this.wrapDtdlPathEntry(filePath, {
          type: 'file',
          name: filePath.base,
          entries: [],
          errors: file.errors,
        })

      const json = dtdlFileContentParser.parse(JSON.parse(file.contents))
      const pathFile = this.extractDtdlEntities(filePath.base, json, model)
      return this.wrapDtdlPathEntry(filePath, pathFile)
    })

    // combine the paths into a single tree structure
    return dtdlFilePaths.reduce(this.dtdlPathReducer.bind(this), [])
  }

  // reducer function to combine DtdlPath entries. Note this is recursively called via mergeDtdlPaths
  private dtdlPathReducer(acc: DtdlPath[], entry: DtdlPath): DtdlPath[] {
    if (entry.type === 'file') {
      acc.push(entry)
      return acc
    }

    const existing = acc.find((e): e is DtdlPath => e.type === 'directory' && e.name === entry.name)
    if (!existing) {
      acc.push(entry)
      return acc
    }

    this.mergeDtdlPaths(existing, entry)
    return acc
  }

  private mergeDtdlPaths(dest: DtdlPath, src: DtdlPath): void {
    if (dest.type !== 'directory' || src.type !== 'directory') {
      throw new Error('Cannot merge non-directory paths')
    }

    if (dest.name !== src.name) {
      throw new Error(`Cannot merge directories with different names: ${dest.name} and ${src.name}`)
    }

    for (const srcEntry of src.entries) {
      this.dtdlPathReducer(dest.entries, srcEntry)
    }
  }

  // recursively builds up an object path structure of directories using extracted path segments
  private wrapDtdlPathEntry(parsedPath: path.ParsedPath, entry: DtdlPath): DtdlPath {
    if (parsedPath.root === parsedPath.dir) {
      return entry
    }

    const parentPath = path.parse(parsedPath.dir)
    const wrapped = {
      type: 'directory' as const,
      name: parentPath.base,
      entries: [entry],
    }

    return this.wrapDtdlPathEntry(parentPath, wrapped)
  }

  // extracts DTDL entities from the parsed contents and builds a DtdlPathFile structure
  private extractDtdlEntities(name: string, contents: DtdlFileContents, model: DtdlObjectModel): DtdlPathFile {
    if (Array.isArray(contents)) {
      return {
        type: 'file',
        name,
        entries: contents.map((c) => this.extractDtdlEntities(name, c, model).entries).flat(),
      }
    }

    const entityId = contents['@id']
    const parsedEntry = model[entityId]

    if (!parsedEntry) {
      throw new Error('Missing entry in model for id: ' + entityId)
    }

    const refEntries: DtdlPathFileEntryContent[] = [
      'properties' in parsedEntry ? this.extractDtdlPathFileContents(parsedEntry.properties, model, entityId) : [],
      'relationships' in parsedEntry
        ? this.extractDtdlPathFileContents(parsedEntry.relationships, model, entityId)
        : [],
    ].flat()

    const entries = [
      {
        ...this.extractDtdlPathFileEntry(parsedEntry),
        type: 'fileEntry' as const,
        entries: refEntries,
      },
    ]

    return {
      type: 'file',
      name,
      entries,
    }
  }

  // extracts the contents of properties and relationships from the model, filtering by the definedIn property matching parent entity ID
  private extractDtdlPathFileContents(
    contents: string[] | Record<string, string>,
    model: DtdlObjectModel,
    parentEntityId: string
  ): DtdlPathFileEntryContent[] {
    const ids = Array.isArray(contents) ? contents : Object.values(contents)

    const result: DtdlPathFileEntryContent[] = []
    for (const propId of ids) {
      const entry = model[propId]
      if (entry.DefinedIn === parentEntityId) {
        result.push(this.extractDtdlPathFileEntry(entry))
      }
    }
    return result
  }

  private extractDtdlPathFileEntry(entry: EntityType) {
    return {
      type: 'fileEntryContent' as const,
      id: entry.Id,
      dtdlType: entry.EntityKind,
      name: entry.displayName?.en ?? ('name' in entry ? entry.name : entry.Id),
    }
  }

  isWithinDepthLimit(obj: object, currentDepth = 1) {
    if (currentDepth > env.get('JSON_DEPTH_LIMIT'))
      throw new UploadError(`JSON too deeply nested, max depth is ${env.get('JSON_DEPTH_LIMIT')}`)

    if (obj !== null && typeof obj === 'object') {
      return Object.values(obj).every((value) => this.isWithinDepthLimit(value, currentDepth + 1))
    }
  }

  static fileContentsToString(files: DtdlFile[]): string {
    const validFiles = files.filter((f) => !f.errors)
    return `[${validFiles.map((f) => f.contents).join(',')}]`
  }
}
