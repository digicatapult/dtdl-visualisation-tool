import express from 'express'
import { Get, Post, Produces, Query, Request, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { inject, injectable } from 'tsyringe'

import Database from '../../db/index.js'
import { UploadError } from '../errors.js'
import { parse, unzipJsonFiles } from '../utils/dtdl/parse.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'

import { Logger, type ILogger } from '../logger.js'
import { GenerateParams } from '../models/controllerTypes.js'
import { Cache, type ICache } from '../utils/cache.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import { dtdlCacheKey, recentFilesFromCookies } from './helpers.js'

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

    const files = await unzipJsonFiles(Buffer.from(file.buffer))

    if (files.length === 0) throw new UploadError(`No valid '.json' files found`)

    const parsedDtdl = await parse(files)

    const output = await this.generator.run(parsedDtdl, 'flowchart', 'elk')

    const id = await this.db.withTransaction(async (db) => {
      const [{ id }] = await db.insert('model', {
        name: file.originalname,
        preview: output.renderForMinimap(),
        source: 'zip',
        owner: null,
        repo: null,
      })

      for (const file of files) {
        await db.insert('dtdl', { ...file, model_id: id })
      }
      return id
    })

    const defaultParams: GenerateParams = { layout: 'elk', diagramType: 'flowchart', expandedIds: [], search: '' }
    this.cache.set(dtdlCacheKey(id, defaultParams), output)

    this.setHeader('HX-Redirect', `/ontology/${id}/view`)
    return
  }
}
