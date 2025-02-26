import express from 'express'
import { randomUUID } from 'node:crypto'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { Get, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { container, inject, injectable } from 'tsyringe'
import Database from '../../db/index.js'
import { Env } from '../env/index.js'
import { UploadError } from '../errors.js'
import { type ILogger, Logger } from '../logger.js'
import { ListItem } from '../models/github.js'
import { type ICache, Cache } from '../utils/cache.js'
import { parseAndInsertDtdl } from '../utils/dtdl/parse.js'
import { GithubRequest } from '../utils/githubRequest.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import SessionStore from '../utils/sessions.js'
import { safeUrl } from '../utils/url.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'
import { recentFilesFromCookies } from './helpers.js'

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
    private generator: SvgGenerator,
    @inject(Logger) private logger: ILogger,
    @inject(Cache) private cache: ICache
  ) {
    super()
    this.logger = logger.child({ controller: '/github' })
  }

  @SuccessResponse(200, '')
  @Get('/picker')
  public async picker(@Request() req: express.Request, @Query() sessionId: string): Promise<HTML | void> {
    const session = this.sessionStore.get(sessionId)
    const returnUrl = safeUrl(`/github/picker`, { sessionId }) // where to redirect to from callback
    if (!session.octokitToken) {
      return this.getOctokitToken(sessionId, returnUrl)
    }

    const populateListLink = safeUrl(`/github/repos`, { page: '1' })
    const recentFiles = await recentFilesFromCookies(req.signedCookies, this.db, this.logger)
    return this.html(this.templates.OpenOntologyRoot({ sessionId, populateListLink, recentFiles }))
  }

  async getOctokitToken(sessionId: string, returnUrl: string): Promise<void> {
    this.sessionStore.update(sessionId, { returnUrl })

    const callback = safeUrl(`${env.get('GH_REDIRECT_URI')}/github/callback`, { sessionId })
    const githubAuthUrl = safeUrl(`https://github.com/login/oauth/authorize`, {
      client_id: env.get('GH_CLIENT_ID'),
      redirect_uri: callback,
    })
    this.setStatus(302)
    this.setHeader('Location', githubAuthUrl)
    return
  }

  // Called by GitHub after external OAuth login
  @SuccessResponse(200)
  @Get('/callback')
  public async callback(@Query() code: string, @Query() sessionId: string): Promise<void> {
    const { access_token } = await this.githubRequest.getAccessToken(code)

    this.sessionStore.update(sessionId, { octokitToken: access_token })

    this.setHeader('Refresh', `0; url=${this.sessionStore.get(sessionId).returnUrl || '/'}`)
    return
  }

  @SuccessResponse(200, '')
  @Get('/repos')
  public async repos(@Query() page: number, @Query() sessionId: string): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)

    const response = await this.githubRequest.getRepos(session.octokitToken, page)

    const repos: ListItem[] = response.map(({ full_name, owner: { login: owner }, name }) => ({
      text: full_name,
      link: safeUrl(`/github/branches`, { owner, repo: name, page: '1' }),
    }))

    return this.html(
      this.templates.githubListItems({
        list: repos,
        nextPageLink: safeUrl(`/github/repos`, { page: `${page + 1}` }),
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
      link: safeUrl(`/github/contents`, { owner, repo, path: '.', ref: name }),
    }))

    return this.html(
      this.templates.githubListItems({
        list: branches,
        nextPageLink: safeUrl(`/github/branches`, {
          owner,
          repo,
          page: `${page + 1}`,
        }),
        ...(page === 1 && { backLink: safeUrl(`/github/repos`, { page: '1' }) }),
      }),
      this.templates.selectFolder({
        // disable the select folder button on branch view
        swapOutOfBand: true,
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
        link: safeUrl(`/github/contents`, {
          owner,
          repo,
          path: dirPath,
          ref,
        }),
      }),
    }))

    // If the path is root link back to branches otherwise link to the previous directory
    const backLink =
      path === '.'
        ? safeUrl(`/github/branches`, { owner, repo, page: '1' })
        : safeUrl(`/github/contents`, {
            owner,
            repo,
            path: dirname(path),
            ref,
          })

    return this.html(
      this.templates.githubListItems({
        list: contents,
        backLink,
      }),
      this.templates.selectFolder({
        // make select folder button clickable
        link: safeUrl(`/github/directory`, {
          owner,
          repo,
          path,
          ref,
        }),
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

    const id = await parseAndInsertDtdl(
      tmpDir,
      `${owner}/${repo}/${ref}/${path}`,
      this.db,
      this.generator,
      false,
      this.cache
    )

    this.setHeader('HX-Redirect', safeUrl(`/ontology/${id}/view`, { sessionId }))
    return
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
