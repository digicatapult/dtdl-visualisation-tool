import express from 'express'
import { Get, Post, Produces, Query, Request, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { inject, injectable } from 'tsyringe'

import { UploadError } from '../errors.js'
import Parser from '../utils/dtdl/parser.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'

import { ModelDb } from '../../db/modelDb.js'
import { Logger, type ILogger } from '../logger.js'
import { Cache, type ICache } from '../utils/cache.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import { recentFilesFromCookies, setCacheWithDefaultParams } from './helpers.js'

@injectable()
@Route('/open')
@Produces('text/html')
export class OpenOntologyController extends HTMLController {
  constructor(
    private modelDb: ModelDb,
    private generator: SvgGenerator,
    private openOntologyTemplates: OpenOntologyTemplates,
    private parser: Parser,
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

    const recentFiles = await recentFilesFromCookies(this.modelDb, req.signedCookies, this.logger)
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

    const files = await this.parser.unzipJsonFiles(Buffer.from(file.buffer))

    if (files.length === 0) throw new UploadError(`No valid '.json' files found`)

    const parsedDtdl = await this.parser.parse(files)
    const output = await this.generator.run(parsedDtdl, 'flowchart', 'elk')
    const id = await this.modelDb.insertModel(file.originalname, output.renderForMinimap(), 'zip', null, null, files)

    setCacheWithDefaultParams(this.cache, id, output)

    this.setHeader('HX-Redirect', `/ontology/${id}/view`)
    return
  }
}
