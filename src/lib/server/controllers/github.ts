import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'

import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { Get, Produces, Query, Route, SuccessResponse } from 'tsoa'
import { container, inject, injectable } from 'tsyringe'
import Database from '../../db/index.js'
import { Env } from '../env.js'
import { InternalError, UploadError } from '../errors.js'
import { type ILogger, Logger } from '../logger.js'
import { ListItem, OAuthToken } from '../models/github.js'
import { parseAndInsertDtdl } from '../utils/dtdl/parse.js'
import { GithubRequest } from '../utils/githubRequest.js'
import SessionStore from '../utils/sessions.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'

const env = container.resolve(Env)

const uploadLimit = env.get('UPLOAD_LIMIT_MB') * 1024 * 1024

@injectable()
@Route('/github')
@Produces('text/html')
export class GithubController extends HTMLController {
  constructor(
    private db: Database,
    private templates: OpenOntologyTemplates,
    private sessionStore: SessionStore,
    private githubRequest: GithubRequest,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/github' })
  }

  @SuccessResponse(200, '')
  @Get('/picker')
  public async picker(@Query() sessionId: string): Promise<HTML | void> {
    const session = this.sessionStore.get(sessionId)
    if (!session.octokitToken) {
      return this.getOctokitToken(sessionId, `/github/picker?sessionId=${sessionId}`)
    }

    return this.html(this.templates.OpenOntologyRoot({ sessionId, populateListLink: `/github/repos?page=1` }))
  }

  async getOctokitToken(sessionId: string, returnUrl: string): Promise<void> {
    this.sessionStore.update(sessionId, { returnUrl })

    this.setStatus(302)
    this.setHeader(
      'Location',
      `https://github.com/login/oauth/authorize?client_id=${env.get('GH_CLIENT_ID')}&redirect_uri=http://${env.get('GH_REDIRECT_HOST')}/github/callback?sessionId=${sessionId}`
    )
    return
  }

  // Called by GitHub after external OAuth login
  @SuccessResponse(302, '')
  @Get('/callback')
  public async callback(@Query() code: string, @Query() sessionId: string): Promise<void> {
    const { access_token } = await this.fetchAccessToken({
      client_id: env.get('GH_CLIENT_ID'),
      client_secret: env.get('GH_CLIENT_SECRET'),
      code,
    })

    this.sessionStore.update(sessionId, { octokitToken: access_token })

    this.setStatus(302)
    this.setHeader('Location', this.sessionStore.get(sessionId).returnUrl || '/')
    return
  }

  @SuccessResponse(200, '')
  @Get('/repos')
  public async repos(@Query() page: number, @Query() sessionId: string): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)

    const response = await this.githubRequest.getRepos(session.octokitToken, page)

    const repos: ListItem[] = response.map(({ full_name, owner: { login: owner }, name }) => ({
      text: full_name,
      link: `/github/branches?owner=${owner}&repo=${name}&page=1`,
    }))

    return this.html(
      this.templates.githubListItems({
        list: repos,
        nextPageLink: `/github/repos?page=${page + 1}`,
      })
    )
  }

  @SuccessResponse(200, '')
  @Get('/branches')
  public async branches(
    @Query() owner: string,
    @Query() repo: string,
    @Query() page: number,
    @Query() sessionId: string
  ): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)

    const response = await this.githubRequest.getBranches(session.octokitToken, owner, repo, page)

    const branches: ListItem[] = response.map(({ name }) => ({
      text: name,
      link: `/github/contents?owner=${owner}&repo=${repo}&path=.&ref=${name}&page=1`,
    }))

    return this.html(
      this.templates.githubListItems({
        list: branches,
        nextPageLink: `/github/branches?owner=${owner}&repo=${repo}&page=${page + 1}`,
        ...(page === 1 && { backLink: `/github/repos?page=1` }),
      })
    )
  }

  @SuccessResponse(200, '')
  @Get('/contents')
  public async contents(
    @Query() owner: string,
    @Query() repo: string,
    @Query() path: string,
    @Query() ref: string,
    @Query() sessionId: string
  ): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)

    const response = await this.githubRequest.getContents(session.octokitToken, owner, repo, path, ref)

    const contents: ListItem[] = response.map(({ name, path: dirPath, type }) => ({
      text: `${type === 'dir' ? '📂' : '📄'} ${name}`,
      ...(type === 'dir' && {
        // directories are clickable to see their contents
        link: `/github/contents?owner=${owner}&repo=${repo}&path=${dirPath}&ref=${ref}`,
      }),
    }))

    // If the path is root link back to branches otherwise link to the previous directory
    const backLink =
      path === '.'
        ? `/github/branches?owner=${owner}&repo=${repo}&page=1`
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
  public async directory(
    @Query() owner: string,
    @Query() repo: string,
    @Query() path: string,
    @Query() ref: string,
    @Query() sessionId: string
  ): Promise<void> {
    const session = this.sessionStore.get(sessionId)

    const tmpDir = await mkdtemp(join(os.tmpdir(), 'dtdl-'))

    const totalUploaded = { total: 0 }
    await this.fetchFiles(session.octokitToken, tmpDir, owner, repo, path, ref, totalUploaded)

    if (totalUploaded.total === 0) {
      throw new UploadError(`No '.json' files found`)
    }

    const id = await parseAndInsertDtdl(tmpDir, `${owner}/${repo}/${ref}/${path}`, this.db, false)

    this.setHeader('HX-Redirect', `/ontology/${id}/view?sessionId=${sessionId}`)
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
    githubToken: string | undefined,
    tempDir: string,
    owner: string,
    repo: string,
    path: string,
    ref: string,
    totalUploadedRef: { total: number }
  ): Promise<void> {
    const response = await this.githubRequest.getContents(githubToken, owner, repo, path, ref)

    for (const entry of response) {
      if (entry.type === 'file' && entry.name.endsWith('.json') && entry.download_url) {
        const fileResponse = await fetch(entry.download_url)
        const fileBuffer = await fileResponse.arrayBuffer()

        totalUploadedRef.total += fileBuffer.byteLength
        if (totalUploadedRef.total > uploadLimit) {
          throw new UploadError(`Total upload must be less than ${env.get('UPLOAD_LIMIT_MB')}MB`)
        }

        const filePath = join(tempDir, `${randomUUID()}.json`)
        this.logger.trace('writing file', entry.name, filePath)
        await writeFile(filePath, Buffer.from(fileBuffer))
      } else if (entry.type === 'dir') {
        await this.fetchFiles(githubToken, tempDir, owner, repo, entry.path, ref, totalUploadedRef)
      }
    }
  }
}
