import express from 'express'
import { dirname } from 'node:path'
import { Get, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import { ModelDb } from '../../db/modelDb.js'
import { GithubNotFound, GithubReqError } from '../errors.js'
import { type ILogger, Logger } from '../logger.js'
import { octokitTokenCookie } from '../models/cookieNames.js'
import { ListItem } from '../models/github.js'
import { type ICache, Cache } from '../utils/cache.js'
import Parser from '../utils/dtdl/parser.js'
import { GithubRequest, authRedirectURL } from '../utils/githubRequest.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import { safeUrl } from '../utils/url.js'
import OpenOntologyTemplates from '../views/components/openOntology.js'
import { HTML, HTMLController } from './HTMLController.js'
import { recentFilesFromCookies, setCacheWithDefaultParams } from './helpers.js'

@injectable()
@Route('/github')
@Produces('text/html')
export class GithubController extends HTMLController {
  constructor(
    private modelDb: ModelDb,
    private templates: OpenOntologyTemplates,
    private githubRequest: GithubRequest,
    private generator: SvgGenerator,
    private parser: Parser,
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
    const recentFiles = await recentFilesFromCookies(this.modelDb, req.signedCookies, this.logger)
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
      this.templates.githubPathLabel({
        path: `Repos:`,
      }),
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
      this.templates.githubPathLabel({
        path: `${owner}/${repo}`,
      }),
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
        swapOutOfBand: true,
        stage: 'branch',
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
      this.templates.githubPathLabel({
        path: `${owner}/${repo}/${ref}${path === '.' ? '' : `/${path}`}`,
      }),
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
        stage: 'folder',
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
    const files = await this.parser.unzipJsonFiles(Buffer.from(zippedBranch), path)

    if (files.length === 0) throw new GithubReqError(`No valid '.json' files found`)

    const parsedDtdl = await this.parser.parse(files)

    const output = await this.generator.run(parsedDtdl, 'flowchart', 'elk')

    const id = await this.modelDb.insertModel(
      `${owner}/${repo}/${ref}/${path}`,
      output.renderForMinimap(),
      'github',
      owner,
      repo,
      files
    )

    setCacheWithDefaultParams(this.cache, id, output)
    this.setHeader('HX-Redirect', `/ontology/${id}/view`)
    return
  }

  /*
   * Returns repo contents of a user-supplied GitHub URL.
   * Attempts the full path, then progressively less nested paths until valid contents are found.
   * e.g. the following paths are attempted in order:
   * `digicatapult/dtdl-visualisation-tool/tree/main/src/lib`
   * `digicatapult/dtdl-visualisation-tool/tree/main/src`
   * `digicatapult/dtdl-visualisation-tool/tree/main/.`
   * `digicatapult/dtdl-visualisation-tool` (returns branches)
   */
  @SuccessResponse(200, '')
  @Get('/navigate')
  public async navigate(@Query() url: string, @Request() req: express.Request): Promise<HTML | void> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    if (!octokitToken) {
      this.setStatus(302)
      this.setHeader('HX-Redirect', authRedirectURL(`/github/picker`))
      return
    }
    const safeUrl = url.replace(/\/$/, '') // remove any trailing slash
    const match = safeUrl.match(
      /^(?:https:\/\/(?:www\.)?github\.com\/)?([^/]+)\/([^/]+)(?:\/(?:tree\/)?([^/]+)(?:\/(.+))?)?$/
    )
    const [, owner, repo, branch, path] = match || []

    if (!owner || !repo) {
      throw new GithubReqError(`Invalid URL: ${url}`)
    }

    if (path && branch) {
      // Generate all possible paths and attempt each, starting from the most nested
      const paths = path.split('/').map((_, i, arr) => arr.slice(0, arr.length - i).join('/'))
      for (const p of paths) {
        const contents = await this.attemptNavigation(this.contents(owner, repo, p, branch, req))
        if (contents) return contents
      }
    }

    if (branch) {
      const contents = await this.attemptNavigation(this.contents(owner, repo, '.', branch, req))
      if (contents) return contents
    }

    return this.branches(owner, repo, 1, req)
  }

  // Attempt to return GitHub contents, 404 can safely be ignored
  async attemptNavigation(nav: Promise<HTML | void>): Promise<HTML | void> {
    try {
      return await nav
    } catch (e) {
      if (e instanceof GithubNotFound) return
      throw e
    }
  }
}
