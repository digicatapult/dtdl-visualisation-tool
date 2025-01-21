import { Endpoints } from '@octokit/types'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'

import { EntityType, getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import { Octokit } from '@octokit/core'
import { basename, dirname, join } from 'node:path'
import { FormField, Get, Post, Produces, Query, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { container, inject, injectable } from 'tsyringe'
import unzipper from 'unzipper'
import Database from '../../db/index.js'
import { Env } from '../env.js'
import { DataError, InternalError, UploadError } from '../errors.js'
import { ListItem, OAuthToken } from '../models/github.js'
import { type UUID } from '../models/strings.js'
import { Cache, type ICache } from '../utils/cache.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { Search, type ISearch } from '../utils/search.js'
import SessionStore, { Session } from '../utils/sessions.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'

type listUserReposResponse = Endpoints['GET /user/repos']['response']
type listBranchesResponse = Endpoints['GET /repos/{owner}/{repo}/branches']['response']
type listRepoContentsResponse = Endpoints['GET /repos/{owner}/{repo}/contents/{path}']['response']

const env = container.resolve(Env)

const DEFAULT_PER_PAGE = 50

@injectable()
@Route('/upload')
@Produces('text/html')
export class UploadController extends HTMLController {
  constructor(
    private dtdlLoader: DtdlLoader,
    private db: Database,
    private templates: MermaidTemplates,
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

    await this.parseAndSetDtdlFromTmp(unzippedPath, file.originalname, sessionId)

    const session = this.sessionStore.get(sessionId)

    return this.html(
      this.templates.MermaidRoot({
        layout: session.layout,
        diagramType: session.diagramType,
        search: undefined,
        sessionId,
      })
    )
  }

  parseAndSetDtdlFromTmp = async (tmpPath: string, dtdlName: string, sessionId: string) => {
    const parser = await getInterop()
    const parsedDtdl = parseDirectories(tmpPath, parser)

    rm(tmpPath, { recursive: true })

    if (!parsedDtdl) {
      throw new DataError('Failed to parse DTDL model')
    }

    const [{ id }] = await this.db.insert('model', { name: dtdlName, parsed: parsedDtdl })

    const updateSession: Partial<Session> = {
      search: undefined,
      highlightNodeId: undefined,
      expandedIds: [],
      dtdlModelId: id,
    }

    this.sessionStore.update(sessionId, updateSession)

    this.search.setCollection(this.dtdlLoader.getCollection(parsedDtdl))
    this.cache.clear()
  }

  @SuccessResponse(200, '')
  @Get('/github')
  public async githubCallback(@Query() code: string, @Query() sessionId: string): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)

    const { access_token } = await this.fetchAccessToken({
      client_id: env.get('GH_CLIENT_ID'),
      client_secret: env.get('GH_CLIENT_SECRET'),
      code,
    })

    this.sessionStore.update(sessionId, { octokitToken: access_token })

    return this.html(
      this.templates.MermaidRoot({
        layout: session.layout,
        diagramType: session.diagramType,
        search: undefined,
        sessionId,
      }),
      this.templates.githubModal({ populateListLink: `/upload/github/repos?per_page=${DEFAULT_PER_PAGE}&page=1` })
    )
  }

  @SuccessResponse(200, '')
  @Get('/github/repos')
  public async githubRepos(
    @Query() per_page: number,
    @Query() page: number,
    @Query() sessionId: string
  ): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)
    const octokit = new Octokit({ auth: session.octokitToken })

    const response: listUserReposResponse = await octokit.request('GET /user/repos', {
      per_page,
      page,
    })

    const repos: ListItem[] = response.data.map(({ full_name, owner: { login: owner }, name }) => ({
      text: full_name,
      link: `/upload/github/branches?owner=${owner}&repo=${name}&per_page=${DEFAULT_PER_PAGE}&page=1`,
    }))

    return this.html(
      this.templates.githubListItems({
        list: repos,
        nextPageLink: `/upload/github/repos?per_page=${per_page}&page=${page + 1}`,
      })
    )
  }

  @SuccessResponse(200, '')
  @Get('/github/branches')
  public async githubBranches(
    @Query() owner: string,
    @Query() repo: string,
    @Query() per_page: number,
    @Query() page: number,
    @Query() sessionId: string
  ): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)
    const octokit = new Octokit({ auth: session.octokitToken })
    const response: listBranchesResponse = await octokit.request('GET /repos/{owner}/{repo}/branches', {
      owner,
      repo,
      per_page,
      page,
    })

    const branches: ListItem[] = response.data.map(({ name }) => ({
      text: name,
      link: `/upload/github/contents?owner=${owner}&repo=${repo}&path=.&ref=${name}&per_page=${DEFAULT_PER_PAGE}&page=1`,
    }))

    return this.html(
      this.templates.githubListItems({
        list: branches,
        nextPageLink: `/upload/github/branches?owner=${owner}&repo=${repo}&per_page=${per_page}&page=${page + 1}`,
        ...(page === 1 && { previousLink: `/upload/github/repos?per_page=${DEFAULT_PER_PAGE}&page=1` }),
      })
    )
  }

  @SuccessResponse(200, '')
  @Get('/github/contents')
  public async githubContents(
    @Query() owner: string,
    @Query() repo: string,
    @Query() path: string,
    @Query() ref: string,
    @Query() sessionId: string
  ): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)
    const octokit = new Octokit({ auth: session.octokitToken })

    const response: listRepoContentsResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path,
      ref,
    })

    if (!Array.isArray(response.data))
      throw new InternalError('Attempted to get contents of a file rather than directory from GitHub API')

    const contents: ListItem[] = response.data.map(({ name, path: dirPath, type }) => ({
      text: `${type === 'dir' ? '📂' : '📄'} ${name}`,
      ...(type === 'dir' && {
        link: `/upload/github/contents?owner=${owner}&repo=${repo}&path=${dirPath}&ref=${ref}`,
      }),
    }))

    // If the path is root link to branches otherwise link to the previous directory
    const previousLink =
      path === '.'
        ? `/upload/github/branches?owner=${owner}&repo=${repo}&per_page=${DEFAULT_PER_PAGE}&page=1`
        : `/upload/github/contents?owner=${owner}&repo=${repo}&path=${dirname(path)}&ref=${ref}`

    return this.html(
      this.templates.githubListItems({
        list: contents,
        previousLink,
      }),
      this.templates.selectFolder({
        link: `/upload/github/directory?owner=${owner}&repo=${repo}&path=${path}&ref=${ref}`,
        swapOutOfBand: true,
      })
    )
  }

  @SuccessResponse(200, '')
  @Get('/github/directory')
  public async githubDirectory(
    @Query() owner: string,
    @Query() repo: string,
    @Query() path: string,
    @Query() ref: string,
    @Query() sessionId: string
  ): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)
    const octokit = new Octokit({ auth: session.octokitToken })

    const tempDir = await mkdtemp(join(os.tmpdir(), 'dtdl-'))

    const fetchFiles = async (owner: string, repo: string, path: string, ref: string): Promise<void> => {
      const response: listRepoContentsResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path,
        ref,
      })

      const contents = Array.isArray(response.data) ? response.data : [response.data]

      for (const entry of contents) {
        if (entry.type === 'file' && entry.download_url && entry.name.endsWith('.json')) {
          const fileResponse = await fetch(entry.download_url)
          const fileBuffer = await fileResponse.arrayBuffer()
          const filePath = join(tempDir, basename(entry.name))
          console.log('writing file', filePath)
          await writeFile(filePath, Buffer.from(fileBuffer))
        } else if (entry.type === 'dir') {
          await fetchFiles(owner, repo, entry.path, ref)
        }
      }
    }

    await fetchFiles(owner, repo, path, ref)
    await this.parseAndSetDtdlFromTmp(tempDir, `${owner}/${repo}/${ref}/${path}`, sessionId)

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
