import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'

import express from 'express'
import { join } from 'node:path'
import { Get, Post, Produces, Query, Request, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import unzipper from 'unzipper'
import Database from '../../db/index.js'
import { UploadError } from '../errors.js'
import { parseAndInsertDtdl } from '../utils/dtdl/parse.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'

import { Logger, type ILogger } from '../logger.js'
import { Cache, type ICache } from '../utils/cache.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import { recentFilesFromCookies } from './helpers.js'

@injectable()
@Route('/open')
@Produces('text/html')
export class OpenOntologyController extends HTMLController {
  constructor(
    private db: Database,
    private generator: SvgGenerator,
    private openOntologyTemplates: OpenOntologyTemplates,
    @inject(Logger) private logger: ILogger,
    @inject(Cache) private cache: ICache
  ) {
    super()
    this.logger = logger.child({ controller: '/open' })
  }

  @SuccessResponse(200)
  @Get('/')
  public async open(@Request() req: express.Request): Promise<HTML> {
    this.setHeader('HX-Push-Url', `/open`)

    const recentFiles = await recentFilesFromCookies(req.signedCookies, this.db, this.logger)
    return this.html(this.openOntologyTemplates.OpenOntologyRoot({ recentFiles }))
  }

  @SuccessResponse(200)
  @Get('/menu')
  public async getMenu(@Query() showContent: boolean): Promise<HTML> {
    return this.html(this.openOntologyTemplates.getMenu({ showContent }))
  }

  @SuccessResponse(302, 'File uploaded successfully')
  @Post('/')
  public async uploadZip(@UploadedFile('file') file: Express.Multer.File): Promise<void> {
    if (file.mimetype !== 'application/zip') {
      throw new UploadError('File must be a .zip')
    }

    let unzippedPath: string
    try {
      unzippedPath = await this.unzip(file.buffer)
    } catch {
      throw new UploadError('Uploaded zip file is not valid')
    }

    const id = await parseAndInsertDtdl(unzippedPath, file.originalname, this.db, this.generator, this.cache, 'zip')

    this.setHeader('HX-Redirect', `/ontology/${id}/view`)
    return
  }

  public async unzip(file: Buffer): Promise<string> {
    const directory = await unzipper.Open.buffer(file)

    const tempDir = os.tmpdir()
    const extractionPath = await mkdtemp(join(tempDir, 'dtdl-'))
    await directory.extract({ path: extractionPath })

    return extractionPath
  }
}
