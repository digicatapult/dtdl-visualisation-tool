import { Endpoints } from '@octokit/types'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'

import { getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import { Octokit } from '@octokit/core'
import { basename, dirname, join } from 'node:path'
import { Get, Produces, Query, Route, SuccessResponse } from 'tsoa'
import { container, injectable } from 'tsyringe'
import Database from '../../db/index.js'
import { Env } from '../env.js'
import { DataError, InternalError, UploadError } from '../errors.js'
import { ListItem, OAuthToken } from '../models/github.js'
import { type UUID } from '../models/strings.js'
import SessionStore from '../utils/sessions.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'

type listUserReposResponse = Endpoints['GET /user/repos']['response']
type listBranchesResponse = Endpoints['GET /repos/{owner}/{repo}/branches']['response']
type listRepoContentsResponse = Endpoints['GET /repos/{owner}/{repo}/contents/{path}']['response']

const env = container.resolve(Env)

const perPage = env.get('GH_PER_PAGE')
const uploadLimit = env.get('UPLOAD_LIMIT_MB') * 1024 * 1024

@injectable()
@Route('/github')
@Produces('text/html')
export class GithubController extends HTMLController {
  constructor(
    private db: Database,
    private templates: MermaidTemplates,
    private sessionStore: SessionStore
  ) {
    super()
  }

  @SuccessResponse(200, '')
  @Get('/')
  public async callback(@Query() code: string, @Query() sessionId: string): Promise<HTML> {
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
      this.templates.githubModal({ populateListLink: `/github/repos?per_page=${perPage}&page=1` })
    )
  }

  @SuccessResponse(200, '')
  @Get('/repos')
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
      link: `/github/branches?owner=${owner}&repo=${name}&per_page=${perPage}&page=1`,
    }))

    return this.html(
      this.templates.githubListItems({
        list: repos,
        nextPageLink: `/github/repos?per_page=${per_page}&page=${page + 1}`,
      })
    )
  }

  @SuccessResponse(200, '')
  @Get('/branches')
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
      link: `/github/contents?owner=${owner}&repo=${repo}&path=.&ref=${name}&per_page=${perPage}&page=1`,
    }))

    return this.html(
      this.templates.githubListItems({
        list: branches,
        nextPageLink: `/github/branches?owner=${owner}&repo=${repo}&per_page=${per_page}&page=${page + 1}`,
        ...(page === 1 && { backLink: `/github/repos?per_page=${perPage}&page=1` }),
      }),
      this.templates.selectFolder({
        swapOutOfBand: true,
      })
    )
  }

  @SuccessResponse(200, '')
  @Get('/contents')
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
        link: `/github/contents?owner=${owner}&repo=${repo}&path=${dirPath}&ref=${ref}`,
      }),
    }))

    // If the path is root link to branches otherwise link to the previous directory
    const backLink =
      path === '.'
        ? `/github/branches?owner=${owner}&repo=${repo}&per_page=${perPage}&page=1`
        : `/github/contents?owner=${owner}&repo=${repo}&path=${dirname(path)}&ref=${ref}`

    return this.html(
      this.templates.githubListItems({
        list: contents,
        backLink,
      }),
      this.templates.selectFolder({
        link: `/github/directory?owner=${owner}&repo=${repo}&path=${path}&ref=${ref}`,
        swapOutOfBand: true,
      })
    )
  }

  @SuccessResponse(200, '')
  @Get('/directory')
  public async githubDirectory(
    @Query() owner: string,
    @Query() repo: string,
    @Query() path: string,
    @Query() ref: string,
    @Query() sessionId: string
  ): Promise<void> {
    const session = this.sessionStore.get(sessionId)
    const octokit = new Octokit({ auth: session.octokitToken })

    const tmpDir = await mkdtemp(join(os.tmpdir(), 'dtdl-'))

    const totalUploaded = { total: 0 }
    await this.fetchFiles(octokit, tmpDir, owner, repo, path, ref, totalUploaded)

    if (totalUploaded.total === 0) {
      throw new UploadError(`No '.json' files found`)
    }

    const id = await this.parseAndSetDtdlFromTmp(tmpDir, `${owner}/${repo}/${ref}/${path}`)

    this.setHeader('HX-Redirect', `/ontology/${id}/view`)
    return
  }

  async fetchAccessToken(body: Record<string, unknown>): Promise<OAuthToken> {
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

  private async fetchFiles(
    octokit: Octokit,
    tempDir: string,
    owner: string,
    repo: string,
    path: string,
    ref: string,
    totalUploadedRef: { total: number }
  ): Promise<void> {
    const response: listRepoContentsResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path,
      ref,
    })

    if (!Array.isArray(response.data))
      throw new InternalError('Attempted to upload file rather than directory from GitHub API')

    for (const entry of response.data) {
      if (entry.type === 'file' && entry.name.endsWith('.json') && entry.download_url) {
        const fileResponse = await fetch(entry.download_url)
        const fileBuffer = await fileResponse.arrayBuffer()

        totalUploadedRef.total += fileBuffer.byteLength
        console.log(fileBuffer.byteLength)
        console.log(totalUploadedRef.total)

        if (totalUploadedRef.total > uploadLimit) {
          throw new UploadError(`Total upload must be less than ${env.get('UPLOAD_LIMIT_MB')}MB`)
        }

        const filePath = join(tempDir, basename(entry.name))
        console.log('writing file', filePath)
        await writeFile(filePath, Buffer.from(fileBuffer))
      } else if (entry.type === 'dir') {
        await this.fetchFiles(octokit, tempDir, owner, repo, entry.path, ref, totalUploadedRef)
      }
    }
  }

  private parseAndSetDtdlFromTmp = async (tmpPath: string, dtdlName: string): Promise<UUID> => {
    const parser = await getInterop()
    const parsedDtdl = parseDirectories(tmpPath, parser)

    rm(tmpPath, { recursive: true })

    if (!parsedDtdl) {
      throw new DataError('Failed to parse DTDL model')
    }

    const [{ id }] = await this.db.insert('model', { name: dtdlName, parsed: parsedDtdl })
    return id
  }
}
