import { getInterop, ModelingException, parseDtdl } from '@digicatapult/dtdl-parser'
import { createHash } from 'crypto'
import { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path, { join, relative } from 'node:path'
import { container, inject, singleton } from 'tsyringe'
import unzipper from 'unzipper'
import z from 'zod'
import { DEFAULT_DB_STRING_LENGTH, DtdlFile } from '../../../db/types.js'
import { Env } from '../../env/index.js'
import { ModellingError, UploadError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import { DtdlEntity, DtdlModel, dtdlObjectModelParser } from '../../models/dtdlOmParser.js'
import { Cache, type ICache } from '../cache.js'

export type DtdlPathFileEntryContent = {
  type: 'fileEntryContent'
  id: string
  name: string
  dtdlType: DtdlEntity['EntityKind']
}
export type DtdlPathFileEntry = {
  type: 'fileEntry'
  name: string
  id: string
  dtdlType: DtdlEntity['EntityKind']
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
type DtdlFileSource = DtdlFileSource[] | DtdlFileEntry
const dtdlFileSourceParser: z.ZodSchema<DtdlFileSource> = z.union([
  z.array(z.lazy(() => dtdlFileSourceParser)),
  entityParser,
])

const env = container.resolve(Env)
@singleton()
export default class Parser {
  constructor(
    @inject(Logger) private logger: ILogger,
    @inject(Cache) private cache: ICache
  ) {}

  private dedupeFilesByPath(files: DtdlFile[]): DtdlFile[] {
    const seenPaths = new Set<string>()
    const deduped: DtdlFile[] = []

    for (const file of files) {
      // Some call sites (and tests) provide in-memory files without a meaningful path.
      // Only de-duplicate when a non-empty path is present.
      if (!file.path) {
        deduped.push(file)
        continue
      }

      if (seenPaths.has(file.path)) continue
      seenPaths.add(file.path)
      deduped.push(file)
    }

    if (deduped.length !== files.length) {
      this.logger.warn(
        { originalCount: files.length, dedupedCount: deduped.length },
        'Duplicate DTDL file paths detected; de-duplicated'
      )
    }

    return deduped
  }

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
      const source = await readFile(fullPath, 'utf-8')
      const noBomJson = source.replace(/^\uFEFF/, '')

      let json = {}
      try {
        json = JSON.parse(noBomJson) // Validate JSON
      } catch {
        this.logger.trace(`Ignoring invalid json: '${fullPath}'`)
        return
      }
      this.isWithinDepthLimit(json)
      return [{ path: relative(topDir, fullPath), source: noBomJson }]
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
    const resolvedPath = path.resolve(topDir, file.path)
    if (!resolvedPath.startsWith(path.resolve(topDir) + path.sep)) {
      throw new UploadError(`Invalid - path traversal detected: '${file.path}'`)
    }

    if (subdir && !file.path.startsWith(join(topDir, subdir))) return

    if (file.type === 'File' && file.path.endsWith('.json')) {
      cumulativeSize.total += file.uncompressedSize
      if (cumulativeSize.total > env.get('UPLOAD_LIMIT_MB') * 1024 * 1024)
        throw new UploadError(`Uncompressed zip exceeds ${env.get('UPLOAD_LIMIT_MB')}MB limit`)

      const fileBuffer = await file.buffer()
      const source = fileBuffer.toString().replace(/^\uFEFF/, '') // Remove BOM

      let json = {}
      try {
        json = JSON.parse(source) // Validate JSON
      } catch {
        this.logger.trace(`Ignoring invalid json: '${file.path}'`)
        return
      }
      this.isWithinDepthLimit(json)
      const path = relative(topDir, file.path)
      if (path.length > DEFAULT_DB_STRING_LENGTH) throw new UploadError(`File path too long: '${path}'`)
      return [{ path, source }]
    }
  }

  /**
   * Parses individual DTDL files and returns them with any parsing errors.
   * Ignores resolution errors.
   */
  async validate(files: DtdlFile[]): Promise<DtdlFile[]> {
    files = this.dedupeFilesByPath(files)
    const parser = await getInterop()

    const filesWithErrors = files.map((file) => {
      const parsed = parseDtdl(file.source, parser)
      return {
        ...file,
        ...(parsed.ExceptionKind === 'Parsing' && { errors: [parsed] }),
      }
    })
    if (filesWithErrors.every((f) => f.errors)) {
      throw new ModellingError(`Unable to parse any file. Open details:`, JSON.stringify(filesWithErrors[0]?.errors))
    }

    return filesWithErrors
  }

  async parseAll(files: DtdlFile[]): Promise<DtdlModel> {
    files = this.dedupeFilesByPath(files)
    const source = Parser.fileSourceToString(files)

    const dtdlHashKey = createHash('sha256').update(source).digest('base64')
    if (this.cache.has(dtdlHashKey)) {
      const cachedParsedDtdl = this.cache.get(dtdlHashKey, dtdlObjectModelParser)
      if (cachedParsedDtdl) return cachedParsedDtdl
    }

    const parser = await getInterop()
    const parsedDtdl = parseDtdl(source, parser)

    if (parsedDtdl.ExceptionKind) {
      throw new ModellingError(`${parsedDtdl.ExceptionKind} error. Open details:`, JSON.stringify(parsedDtdl))
    }

    const validatedDtdl = dtdlObjectModelParser.parse(parsedDtdl)
    this.cache.set<DtdlModel>(dtdlHashKey, validatedDtdl)

    return validatedDtdl
  }

  extractDtdlPaths(files: DtdlFile[], model: DtdlModel): DtdlPath[] {
    // for each file parse the source and extract the entities along their file system path
    const dtdlFilePaths = files.map((file) => {
      const filePath = path.parse(file.path)
      if (file.errors)
        return this.wrapDtdlPathEntry(filePath, {
          type: 'file',
          name: filePath.base,
          entries: [],
          errors: file.errors,
        })

      const json = dtdlFileSourceParser.parse(JSON.parse(file.source))
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

  // extracts DTDL entities from the parsed source and builds a DtdlPathFile structure
  private extractDtdlEntities(name: string, source: DtdlFileSource, model: DtdlModel): DtdlPathFile {
    if (Array.isArray(source)) {
      return {
        type: 'file',
        name,
        entries: source.map((c) => this.extractDtdlEntities(name, c, model).entries).flat(),
      }
    }

    const entityId = source['@id']
    const parsedEntry = model[entityId]

    if (!parsedEntry) {
      throw new Error('Missing entry in model for id: ' + entityId)
    }

    const refEntries: DtdlPathFileEntryContent[] = [
      this.extractDtdlPathFileContentsSafe(parsedEntry.properties, model, entityId),
      this.extractDtdlPathFileContentsSafe(parsedEntry.relationships, model, entityId),
      this.extractDtdlPathFileContentsSafe(parsedEntry.telemetries, model, entityId),
      this.extractDtdlPathFileContentsSafe(parsedEntry.commands, model, entityId),
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
    model: DtdlModel,
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

  private extractDtdlPathFileContentsSafe(
    contents: unknown,
    model: DtdlModel,
    parentEntityId: string
  ): DtdlPathFileEntryContent[] {
    if (Array.isArray(contents)) {
      return this.extractDtdlPathFileContents(contents, model, parentEntityId)
    }

    if (contents && typeof contents === 'object') {
      return this.extractDtdlPathFileContents(contents as Record<string, string>, model, parentEntityId)
    }

    return []
  }

  private extractDtdlPathFileEntry(entry: DtdlEntity) {
    const name =
      typeof entry.displayName?.en === 'string'
        ? entry.displayName.en
        : 'name' in entry && typeof entry.name === 'string'
          ? entry.name
          : entry.Id
    return {
      type: 'fileEntryContent' as const,
      id: entry.Id,
      dtdlType: entry.EntityKind,
      name,
    }
  }

  isWithinDepthLimit(obj: object, currentDepth = 1) {
    if (currentDepth > env.get('JSON_DEPTH_LIMIT'))
      throw new UploadError(`JSON too deeply nested, max depth is ${env.get('JSON_DEPTH_LIMIT')}`)

    if (obj !== null && typeof obj === 'object') {
      return Object.values(obj).every((value) => this.isWithinDepthLimit(value, currentDepth + 1))
    }
  }

  static fileSourceToString(files: DtdlFile[]): string {
    const validFiles = files.filter((f) => !f.errors)
    const combined = validFiles.flatMap((f) => {
      const parsed = JSON.parse(f.source) as unknown
      return Array.isArray(parsed) ? parsed : [parsed]
    })
    return JSON.stringify(combined)
  }
}
