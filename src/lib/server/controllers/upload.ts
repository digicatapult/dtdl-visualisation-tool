import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'

import express from 'express'
import { join } from 'node:path'
import { FormField, Get, Path, Post, Produces, Query, Request, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import unzipper from 'unzipper'
import Database from '../../db/index.js'
import { SessionError, UploadError } from '../errors.js'
import { type UUID } from '../models/strings.js'
import { parseAndInsertDtdl } from '../utils/dtdl/parse.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'

import { Logger, type ILogger } from '../logger.js'
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
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/open' })
  }

  @SuccessResponse(200)
  @Get('/')
  public async open(@Request() req: express.Request, @Query() sessionId?: UUID): Promise<HTML> {
    if (!sessionId) {
      throw new SessionError('No session ID provided')
    }
    this.setHeader('HX-Push-Url', `/open`)

    const recentFiles = await recentFilesFromCookies(req.signedCookies, this.db, this.logger)
    return this.html(this.openOntologyTemplates.OpenOntologyRoot({ sessionId, recentFiles }))
  }

  @SuccessResponse(200)
  @Get('/menu')
  public async getMenu(@Query() showContent: boolean, @Query() sessionId: UUID): Promise<HTML> {
    return this.html(this.openOntologyTemplates.getMenu({ showContent, sessionId }))
  }

  @SuccessResponse(302, 'File uploaded successfully')
  @Post('/')
  public async uploadZip(@UploadedFile('file') file: Express.Multer.File, @FormField() sessionId: UUID): Promise<void> {
    if (file.mimetype !== 'application/zip') {
      throw new UploadError('File must be a .zip')
    }

    let unzippedPath: string
    try {
      unzippedPath = await this.unzip(file.buffer)
    } catch {
      throw new UploadError('Uploaded zip file is not valid')
    }

    const id = await parseAndInsertDtdl(unzippedPath, file.originalname, this.db, this.generator, false)

    this.setHeader('HX-Redirect', `/ontology/${id}/view?sessionId=${sessionId}`)
    return
  }

  public async unzip(file: Buffer): Promise<string> {
    const directory = await unzipper.Open.buffer(file)

    const tempDir = os.tmpdir()
    const extractionPath = await mkdtemp(join(tempDir, 'dtdl-'))
    await directory.extract({ path: extractionPath })

    return extractionPath
  }

  @SuccessResponse(302, 'Redirect')
  @Get('/{dtdlModelId}')
  public async loadFile(@Path() dtdlModelId: UUID, @Query() sessionId: UUID): Promise<void> {
    this.setHeader('HX-Redirect', `/ontology/${dtdlModelId}/view?sessionId=${sessionId}`)
    return
  }
}
