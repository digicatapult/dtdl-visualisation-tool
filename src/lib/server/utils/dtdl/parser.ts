import { DtdlObjectModel, getInterop, parseDtdl } from '@digicatapult/dtdl-parser'
import { createHash } from 'crypto'
import { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { container, inject, singleton } from 'tsyringe'
import unzipper from 'unzipper'
import { DtdlFile } from '../../../db/types.js'
import { Env } from '../../env/index.js'
import { ModellingError, UploadError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import { dtdlObjectModelParser } from '../../models/dtdlOmParser.js'
import { Cache, type ICache } from '../cache.js'

const env = container.resolve(Env)
@singleton()
export default class Parser {
  constructor(
    @inject(Logger) private logger: ILogger,
    @inject(Cache) private cache: ICache
  ) {}

  async getJsonFiles(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })
    const files = await Promise.all(entries.map((entry) => this.handleFileOrDir(dir, entry)))
    return files.flat().filter((f) => f !== undefined)
  }

  private async handleFileOrDir(dir: string, entry: Dirent): Promise<DtdlFile[] | undefined> {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      return this.getJsonFiles(fullPath)
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
      return [{ path: relative(dir, fullPath), contents: noBomJson }]
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

  async parse(files: DtdlFile[]): Promise<DtdlObjectModel> {
    const allContents = `[${files.map((file) => file.contents).join(',')}]`

    const dtdlHashKey = createHash('sha256').update(allContents).digest('base64')
    if (this.cache.has(dtdlHashKey)) {
      const cachedParsedDtdl = this.cache.get(dtdlHashKey, dtdlObjectModelParser)
      if (cachedParsedDtdl) return cachedParsedDtdl
    }

    const parser = await getInterop()

    const parsedDtdl = parseDtdl(allContents, parser)

    if (parsedDtdl.ExceptionKind) {
      throw new ModellingError(
        `${parsedDtdl.ExceptionKind} error, Open details for more information`,
        JSON.stringify(parsedDtdl)
      )
    }
    this.cache.set<DtdlObjectModel>(dtdlHashKey, parsedDtdl)

    return parsedDtdl
  }

  isWithinDepthLimit(obj: object, currentDepth = 1) {
    if (currentDepth > env.get('JSON_DEPTH_LIMIT'))
      throw new UploadError(`JSON too deeply nested, max depth is ${env.get('JSON_DEPTH_LIMIT')}`)

    if (obj !== null && typeof obj === 'object') {
      return Object.values(obj).every((value) => this.isWithinDepthLimit(value, currentDepth + 1))
    }
  }
}
