import { Endpoints } from '@octokit/types'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'

import { EntityType, getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import { Octokit } from '@octokit/core'
import { join } from 'node:path'
import { FormField, Get, Post, Produces, Query, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { container, inject, injectable } from 'tsyringe'
import unzipper from 'unzipper'
import Database from '../../db/index.js'
import { Env } from '../env.js'
import { DataError, InternalError, InvalidQueryError, UploadError } from '../errors.js'
import { OAuthToken } from '../models/github.js'
import { type UUID } from '../models/strings.js'
import { Cache, type ICache } from '../utils/cache.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { Search, type ISearch } from '../utils/search.js'
import SessionStore from '../utils/sessions.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'

type listUserReposResponse = Endpoints['GET /user/repos']['response']

const env = container.resolve(Env)
@injectable()
@Route('/upload')
@Produces('text/html')
export class UploadController extends HTMLController {
  constructor(
    private dtdlLoader: DtdlLoader,
    private db: Database,
    private templates: MermaidTemplates,
    private octokit: Octokit,
    @inject(Search) private search: ISearch<EntityType>,
    @inject(Cache) private cache: ICache,
    private sessionStore: SessionStore
  ) {
    super()
  }

  @SuccessResponse(200, 'File uploaded successfully')
  @Post('/')
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

    return this.html(
      this.templates.MermaidRoot({
        layout: session.layout,
        diagramType: session.diagramType,
        search: undefined,
        sessionId,
      })
    )
  }

  @SuccessResponse(200, '')
  @Get('/github')
  public async githubCallback(@Query() code: string, @Query() sessionId: string): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)
    if (!session) {
      throw new InvalidQueryError(
        'Session Error',
        'Please refresh the page or try again later',
        `Session ${sessionId} not found in session store`,
        false
      )
    }

    const { access_token } = await this.fetchAccessToken({
      client_id: env.get('GH_CLIENT_ID'),
      client_secret: env.get('GH_CLIENT_SECRET'),
      code,
    })

    this.octokit = new Octokit({ auth: access_token })

    const response: listUserReposResponse = await this.octokit.request('GET /user/repos', {
      per_page: 100,
      page: 1,
    })
    const repos = response.data.map(({ full_name }) => full_name)

    return this.html(
      this.templates.MermaidRoot({
        layout: session.layout,
        diagramType: session.diagramType,
        search: undefined,
        sessionId,
      }),
      this.templates.githubModal({ open: true, repos })
    )
  }

  public async unzip(file: Buffer): Promise<string> {
    const directory = await unzipper.Open.buffer(file)

    const tempDir = os.tmpdir()
    const extractionPath = await mkdtemp(join(tempDir, 'dtdl-'))
    await directory.extract({ path: extractionPath })

    return extractionPath
  }

  private async fetchAccessToken(body: Record<string, unknown>): Promise<OAuthToken> {
    const url = `https://github.com/login/oauth/access_token`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    const json = await response.json()

    if (!response.ok || !json.access_token) {
      throw new InternalError(`Unexpected error calling POST ${url}: ${json}`)
    }

    return json as OAuthToken
  }
}
