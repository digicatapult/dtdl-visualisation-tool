import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'

import { getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import express from 'express'
import { join } from 'node:path'
import { FormField, Get, Path, Post, Produces, Query, Request, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import unzipper from 'unzipper'
import Database from '../../db/index.js'
import { DataError, SessionError, UploadError } from '../errors.js'
import { type CookieHistoryParams } from '../models/controllerTypes.js'
import { type UUID } from '../models/strings.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'

import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { Logger, type ILogger } from '../logger.js'
import { RecentFile } from '../models/openTypes.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'

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
    const cookieName = 'DTDL_MODEL_HISTORY'
    const cookieHistory: CookieHistoryParams[] = req.signedCookies[cookieName] ? req.signedCookies[cookieName] : []
    const models = await Promise.all(
      cookieHistory.map(async (entry) => {
        try {
          const [model] = await this.db.get('model', { id: entry.id })
          return model
        } catch (error) {
          this.logger.warn(`Failed to fetch model for ID ${entry.id}`, error)
          return null
        }
      })
    )
    const validModels = models.filter((model) => model !== null)
    const recentFiles: RecentFile[] = validModels
      .map((validModel) => {
        const svgElement = validModel.preview ? validModel.preview : 'No Preview'
        const historyEntry = cookieHistory.find((entry) => entry.id === validModel.id)
        const timestamp = historyEntry?.timestamp ?? 0
        return {
          fileName: validModel.name,
          lastVisited: historyEntry ? this.formatLastVisited(timestamp) : 'Unknown',
          preview: svgElement,
          dtdlModelId: validModel.id,
          rawTimestamp: timestamp,
        }
      })
      .sort((a, b) => b.rawTimestamp - a.rawTimestamp)
      .map(({ rawTimestamp, ...recentFile }) => recentFile)

    return this.html(this.openOntologyTemplates.OpenOntologyRoot({ sessionId, recentFiles }))
  }

  @SuccessResponse(200)
  @Get('/menu')
  public async getMenu(@Query() showContent: boolean): Promise<HTML> {
    return this.html(this.openOntologyTemplates.getMenu({ showContent }))
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

    const parser = await getInterop()
    const parsedDtdl = parseDirectories(unzippedPath, parser)

    rm(unzippedPath, { recursive: true })

    if (!parsedDtdl) {
      throw new DataError('Failed to parse DTDL model')
    }

    const output = await this.generator.run(parsedDtdl, 'flowchart', 'elk')

    const [{ id }] = await this.db.insert('model', {
      name: file.originalname,
      parsed: parsedDtdl,
      preview: output.renderForMinimap(),
    })

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

  private formatLastVisited(timestamp: number): string {
    const date = new Date(timestamp)
    if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`
    if (isYesterday(date)) return `Yesterday at ${format(date, 'HH:mm')}`
    return `${formatDistanceToNow(date, { addSuffix: true })}`
  }
}
