import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'

import { EntityType, getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import { join } from 'node:path'
import { FormField, Get, Post, Produces, Query, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import unzipper from 'unzipper'
import Database from '../../db/index.js'
import { DataError, InvalidQueryError, UploadError } from '../errors.js'
import { type UUID } from '../models/strings.js'
import { Cache, type ICache } from '../utils/cache.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { Search, type ISearch } from '../utils/search.js'
import SessionStore from '../utils/sessions.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'

@injectable()
@Route('/upload')
@Produces('text/html')
export class UploadController extends HTMLController {
  constructor(
    private dtdlLoader: DtdlLoader,
    private db: Database,
    private templates: MermaidTemplates,
    private openOntologyTemplates: OpenOntologyTemplates,
    @inject(Search) private search: ISearch<EntityType>,
    @inject(Cache) private cache: ICache,
    private sessionStore: SessionStore
  ) {
    super()
  }

  @SuccessResponse(200)
  @Get('/')
  public async uploadForm(@Query() sessionId: UUID): Promise<HTML> {
    this.setHeader('HX-Push-Url', `/upload`)
    return this.html(this.openOntologyTemplates.OpenOntologyRoot({ sessionId }))
  }

  @SuccessResponse(200)
  @Get('/uploadButton')
  public async getLegend(@Query() showContent: boolean): Promise<HTML> {
    return this.html(this.openOntologyTemplates.uploadMethod({ showContent }))
  }

  @SuccessResponse(200, 'File uploaded successfully')
  @Post('/zip')
  public async uploadZip(@UploadedFile('file') file: Express.Multer.File, @FormField() sessionId: UUID): Promise<HTML> {
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

    const [{ id }] = await this.db.insert('model', { name: file.originalname, parsed: parsedDtdl })

    const session = this.sessionStore.get(sessionId)
    if (!session) {
      throw new InvalidQueryError(
        'Session Error',
        'Please refresh the page or try again later',
        `Session ${sessionId} not found in session store`,
        false
      )
    }
    this.sessionStore.set(sessionId, {
      layout: session.layout,
      diagramType: session.diagramType,
      search: undefined,
      highlightNodeId: undefined,
      expandedIds: [],
      dtdlModelId: id,
    })

    this.search.setCollection(this.dtdlLoader.getCollection(parsedDtdl))
    this.cache.clear()
    this.setHeader('HX-Push-Url', `/?sessionId=${sessionId}`)

    return this.html(
      this.templates.MermaidRoot({
        layout: session.layout,
        diagramType: session.diagramType,
        search: undefined,
        sessionId,
      })
    )
  }

  public async unzip(file: Buffer): Promise<string> {
    const directory = await unzipper.Open.buffer(file)

    const tempDir = os.tmpdir()
    const extractionPath = await mkdtemp(join(tempDir, 'dtdl-'))
    await directory.extract({ path: extractionPath })

    return extractionPath
  }
}
