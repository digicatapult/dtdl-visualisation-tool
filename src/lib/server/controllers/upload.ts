import fs from 'node:fs'
import os from 'node:os'

import { EntityType, getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import { Post, Produces, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import unzipper from 'unzipper'
import { Cache, type ICache } from '../utils/cache.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { allInterfaceFilter } from '../utils/dtdl/extract.js'
import { Search, type ISearch } from '../utils/search.js'
import { HTML, HTMLController } from './HTMLController.js'

@injectable()
@Route('/upload')
@Produces('text/html')
export class UploadController extends HTMLController {
  constructor(
    private dtdlLoader: DtdlLoader,
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
    const directory = await unzipper.Open.buffer(file.buffer)

    console.log(directory.numberOfRecords)
    console.log(directory.sizeOfCentralDirectory)

    const tempDir = os.tmpdir()
    const extractionPath = fs.mkdtempSync(tempDir)
    await directory.extract({ path: extractionPath })

    const parser = await getInterop()
    const parsedDtdl = parseDirectories(extractionPath, parser)
    //await fs.rmdir(extractionPath, { recursive: true })

    if (!parsedDtdl) {
      return this.html('Failed to parse DTDL')
    }
    const dtdlModelId = this.dtdlLoader.setDtdlModel(parsedDtdl)
    const interfaces = Object.entries(parsedDtdl)
      .filter(allInterfaceFilter)
      .map(([, entity]) => entity)
    this.search.setCollection(interfaces)
    this.cache.clear()

    this.setHeader('HX-Redirect', '/')

    return this.html(dtdlModelId)
  }
}
