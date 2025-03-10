import express from 'express'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { Get, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { container, inject, injectable } from 'tsyringe'
import Database from '../../db/index.js'
import { PartialInsertDtdl } from '../../db/types.js'
import { Env } from '../env/index.js'
import { UploadError } from '../errors.js'
import { type ILogger, Logger } from '../logger.js'
import { octokitTokenCookie } from '../models/cookieNames.js'
import { ListItem } from '../models/github.js'
import { type ICache, Cache } from '../utils/cache.js'
import { parseAndInsertDtdl } from '../utils/dtdl/parse.js'
import { GithubRequest } from '../utils/githubRequest.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
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
  public async picker(@Request() req: express.Request): Promise<HTML | void> {
    if (!req.signedCookies[octokitTokenCookie]) {
      return this.getOctokitToken(`/github/picker`, false)
    }

    const populateListLink = safeUrl(`/github/repos`, { page: '1' })
    const recentFiles = await recentFilesFromCookies(req.signedCookies, this.db, this.logger)
    return this.html(this.templates.OpenOntologyRoot({ populateListLink, recentFiles }))
  }

  async getOctokitToken(returnUrl: string, hxRidirect: boolean = true): Promise<void> {
    const githubAuthUrl = safeUrl(`https://github.com/login/oauth/authorize`, {
      client_id: env.get('GH_CLIENT_ID'),
      redirect_uri: `${env.get('GH_REDIRECT_ORIGIN')}/github/callback?returnUrl=${returnUrl}`,
    })
    this.setStatus(302)

    // if used as part of a htmx response, use HX-Redirect instead of location
    if (hxRidirect) this.setHeader('HX-Redirect', githubAuthUrl)
    else this.setHeader('Location', githubAuthUrl)
    return
  }

  // Called by GitHub after external OAuth login
  @SuccessResponse(200)
  @Get('/callback')
  public async callback(
    @Query() code: string,
    @Query() returnUrl: string,
    @Request() req: express.Request
  ): Promise<void> {
    const { access_token, expires_in } = await this.githubRequest.getAccessToken(code)

    req.res?.cookie(octokitTokenCookie, access_token, {
      sameSite: true,
      maxAge: (expires_in - 5 * 60) * 1000, // 5 mins less than expiry
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
    })

    this.setHeader('Refresh', `0; url=${returnUrl || '/'}`)
    return
  }

  @SuccessResponse(200, '')
  @Get('/repos')
  public async repos(@Query() page: number, @Request() req: express.Request): Promise<HTML | void> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    if (!octokitToken) {
      return this.getOctokitToken(`/github/picker`)
    }

    const response = await this.githubRequest.getRepos(octokitToken, page)

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
    @Request() req: express.Request
  ): Promise<HTML | void> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    if (!octokitToken) {
      return this.getOctokitToken(`/github/picker`)
    }

    const response = await this.githubRequest.getBranches(octokitToken, owner, repo, page)

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
    @Request() req: express.Request
  ): Promise<HTML | void> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    if (!octokitToken) {
      return this.getOctokitToken(`/github/picker`)
    }

    const response = await this.githubRequest.getContents(octokitToken, owner, repo, path, ref)

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
    @Request() req: express.Request
  ): Promise<void> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    if (!octokitToken) {
      return this.getOctokitToken(`/github/picker`)
    }

    const tmpDir = await mkdtemp(join(os.tmpdir(), 'dtdl-'))

    const acc: { files: PartialInsertDtdl[]; total: number } = { files: [], total: 0 }
    await this.fetchFiles(octokitToken, tmpDir, owner, repo, path, ref, this.db, acc)

    if (acc.files.length === 0) {
      throw new UploadError(`No valid DTDL '.json' files found`)
    }

    try {
      const id = await parseAndInsertDtdl(
        tmpDir,
        `${owner}/${repo}/${ref}/${path}`,
        this.db,
        this.generator,
        this.cache,
        acc.files
      )
      this.setHeader('HX-Redirect', `/ontology/${id}/view`)
      return
    } finally {
      await rm(tmpDir, { recursive: true })
    }
  }

  private async fetchFiles(
    githubToken: string | undefined,
    parentDir: string,
    owner: string,
    repo: string,
    path: string,
    ref: string,
    db: Database,
    acc: { files: PartialInsertDtdl[]; total: number }
  ): Promise<void> {
    const response = await this.githubRequest.getContents(githubToken, owner, repo, path, ref)

    for (const entry of response) {
      const entryPath = join(parentDir, entry.name)
      if (entry.type === 'file' && entry.name.endsWith('.json') && entry.download_url) {
        const fileResponse = await fetch(entry.download_url)
        const fileBuffer = await fileResponse.arrayBuffer()

        if (acc.total + fileBuffer.byteLength > uploadLimit) {
          throw new UploadError(`Total upload must be less than ${env.get('UPLOAD_LIMIT_MB')}MB`)
        }

        const fileString = Buffer.from(fileBuffer).toString()
        const dtdl = JSON.parse(fileString)
        let entityIds: string[] = []
        // search file for entity ids
        if (Array.isArray(dtdl)) {
          entityIds = dtdl.map((entity) => entity['@id'])
        } else {
          entityIds = [dtdl['@id']]
        }

        if (entityIds.length === 0) {
          this.logger.trace('ignoring invalid DTDL json', entryPath)
          return
        }

        this.logger.trace('writing file', entry.name, entryPath)
        await writeFile(entryPath, Buffer.from(fileBuffer))
        acc.total += fileBuffer.byteLength
        acc.files.push({
          path: entryPath,
          contents: fileString,
          entity_ids: entityIds,
        })
      } else if (entry.type === 'dir') {
        await mkdir(entryPath)
        await this.fetchFiles(githubToken, entryPath, owner, repo, entry.path, ref, db, acc)
      }
    }
  }
}
