import express from 'express'
import { dirname } from 'node:path'
import { Get, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { container, inject, injectable } from 'tsyringe'
import Database from '../../db/index.js'
import { Env } from '../env/index.js'
import { GithubReqError } from '../errors.js'
import { type ILogger, Logger } from '../logger.js'
import { GenerateParams } from '../models/controllerTypes.js'
import { octokitTokenCookie } from '../models/cookieNames.js'
import { ListItem } from '../models/github.js'
import { type ICache, Cache } from '../utils/cache.js'
import { parse, unzipJsonFiles } from '../utils/dtdl/parse.js'
import { GithubRequest, authRedirectURL } from '../utils/githubRequest.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import { safeUrl } from '../utils/url.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'
import { dtdlCacheKey, recentFilesFromCookies } from './helpers.js'

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
      this.setStatus(302)
      this.setHeader('Location', authRedirectURL(`/github/picker`))
      return
    }

    const populateListLink = safeUrl(`/github/repos`, { page: '1' })
    const recentFiles = await recentFilesFromCookies(req.signedCookies, this.db, this.logger)
    return this.html(this.templates.OpenOntologyRoot({ populateListLink, recentFiles }))
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
      this.setStatus(302)
      this.setHeader('HX-Redirect', authRedirectURL(`/github/picker`))
      return
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
      this.setStatus(302)
      this.setHeader('HX-Redirect', authRedirectURL(`/github/picker`))
      return
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
      this.setStatus(302)
      this.setHeader('HX-Redirect', authRedirectURL(`/github/picker`))
      return
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
      this.setStatus(302)
      this.setHeader('HX-Redirect', authRedirectURL(`/github/picker`))
      return
    }

    const zippedBranch = await this.githubRequest.getZip(octokitToken, owner, repo, ref)
    const files = await unzipJsonFiles(Buffer.from(zippedBranch), path)

    if (files.length === 0) throw new GithubReqError(`No valid '.json' files found`)

    const parsedDtdl = await parse(files)

    const output = await this.generator.run(parsedDtdl, 'flowchart', 'elk')

    const id = await this.db.withTransaction(async (db) => {
      const [{ id }] = await db.insert('model', {
        name: `${owner}/${repo}/${ref}/${path}`,
        preview: output.renderForMinimap(),
        source: 'github',
        owner: owner,
        repo: repo,
      })

      for (const file of files) {
        await db.insert('dtdl', { ...file, model_id: id })
      }
      return id
    })

    const defaultParams: GenerateParams = { layout: 'elk', diagramType: 'flowchart', expandedIds: [], search: '' }
    this.cache.set(dtdlCacheKey(id, defaultParams), output)
    this.setHeader('HX-Redirect', `/ontology/${id}/view`)
    return
  }
}
