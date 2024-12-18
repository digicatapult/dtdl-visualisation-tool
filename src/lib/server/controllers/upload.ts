import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'

import { EntityType, getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import { Post, Produces, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import unzipper from 'unzipper'
import Database from '../../db/index.js'
import { Cache, type ICache } from '../utils/cache.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { Search, type ISearch } from '../utils/search.js'
import { HTML, HTMLController } from './HTMLController.js'

@injectable()
@Route('/upload')
@Produces('text/html')
export class UploadController extends HTMLController {
  constructor(
    private dtdlLoader: DtdlLoader,
    private db: Database,
    @inject(Search) private search: ISearch<EntityType>,
    @inject(Cache) private cache: ICache
  ) {
    super()
  }

  @SuccessResponse(200, 'File uploaded successfully')
  @Post('/')
  public async uploadZip(@UploadedFile('file') file: Express.Multer.File): Promise<HTML> {
    if (file.mimetype !== 'application/zip') {
      return this.html('Only .zip accepted')
    }

    const unzippedPath = await this.unzip(file.buffer)

    const parser = await getInterop()
    const parsedDtdl = parseDirectories(unzippedPath, parser)

    rm(unzippedPath, { recursive: true })

    if (!parsedDtdl) {
      return this.html('Failed to parse DTDL')
    }

    this.db.insert('model', { name: file.originalname, parsed: parsedDtdl })
    this.dtdlLoader.setDtdlModel(parsedDtdl)
    this.search.setCollection(this.dtdlLoader.getCollection())
    this.cache.clear()

    this.setHeader('HX-Redirect', '/')

    return this.html(`${file.originalname}`)
  }

  private async unzip(file: Buffer): Promise<string> {
    const directory = await unzipper.Open.buffer(file)

    const tempDir = os.tmpdir()
    const extractionPath = await mkdtemp(tempDir)
    await directory.extract({ path: extractionPath })

    return extractionPath
  }
}
