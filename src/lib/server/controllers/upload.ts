import express from 'express'
import { randomUUID } from 'node:crypto'
import { Get, Middlewares, Post, Produces, Query, Request, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { container, inject, injectable } from 'tsyringe'

import { UploadError } from '../errors.js'
import { octokitTokenCookie } from '../models/cookieNames.js'
import Parser from '../utils/dtdl/parser.js'
import { PostHogService } from '../utils/postHog/postHogService.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'

import { ModelDb } from '../../db/modelDb.js'
import { Logger, type ILogger } from '../logger.js'
import { Cache, type ICache } from '../utils/cache.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import { RateLimiter } from '../utils/rateLimit.js'
import { recentFilesFromCookies, setCacheWithDefaultParams } from './helpers.js'

const rateLimiter = container.resolve(RateLimiter)

@injectable()
@Route('/open')
export class OpenOntologyController extends HTMLController {
  constructor(
    private modelDb: ModelDb,
    private generator: SvgGenerator,
    private openOntologyTemplates: OpenOntologyTemplates,
    private parser: Parser,
    private postHog: PostHogService,
    @inject(Logger) private logger: ILogger,
    @inject(Cache) private cache: ICache
  ) {
    super()
    this.logger = logger.child({ controller: '/open' })
  }

  @SuccessResponse(200)
  @Produces('text/html')
  @Get('/')
  public async open(@Request() req: express.Request): Promise<HTML> {
    this.setHeader('HX-Push-Url', `/open`)

    const recentFiles = await recentFilesFromCookies(this.modelDb, req.signedCookies, this.logger)
    return this.html(this.openOntologyTemplates.OpenOntologyRoot({ recentFiles }))
  }

  @SuccessResponse(200)
  @Produces('text/html')
  @Get('/menu')
  public async getMenu(@Query() showContent: boolean): Promise<HTML> {
    return this.html(this.openOntologyTemplates.getMenu({ showContent }))
  }

  @SuccessResponse(302, 'File uploaded successfully')
  @Middlewares(rateLimiter.strictLimitMiddleware)
  @Post('/')
  public async uploadZip(
    @UploadedFile('file') file: Express.Multer.File,
    @Request() req: express.Request
  ): Promise<void> {
    if (file.mimetype !== 'application/zip') {
      throw new UploadError('File must be a .zip')
    }

    const jsonFiles = await this.parser.unzipJsonFiles(Buffer.from(file.buffer))

    if (jsonFiles.length === 0) throw new UploadError(`No valid '.json' files found`)

    const files = await this.parser.validate(jsonFiles)
    const parsedDtdl = await this.parser.parseAll(files)
    const output = await this.generator.run(parsedDtdl, 'flowchart', 'elk')
    const id = await this.modelDb.insertModel(file.originalname, output.renderForMinimap(), 'zip', null, null, files)

    setCacheWithDefaultParams(this.cache, id, output)

    // Track upload event with proper user/session identification (fire-and-forget)
    const octokitToken = req.signedCookies[octokitTokenCookie]
    const sessionId = randomUUID()
    const distinctId = await this.postHog.getDistinctId(octokitToken, sessionId)

    this.postHog.trackUploadOntology(distinctId, {
      ontologyId: id,
      source: 'zip',
      fileCount: files.length,
      fileName: file.originalname,
    })

    this.setHeader('HX-Redirect', `/ontology/${id}/view`)
    return
  }
}
