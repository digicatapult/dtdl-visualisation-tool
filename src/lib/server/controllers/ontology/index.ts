import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { Get, Middlewares, Path, Produces, Queries, Query, Request, Route, SuccessResponse } from 'tsoa'
import { container, inject, injectable } from 'tsyringe'
import { ModelDb } from '../../../db/modelDb.js'
import { InternalError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import {
  A11yPreference,
  GenerateParams,
  urlQueryKeys,
  UrlQueryKeys,
  type CookieHistoryParams,
  type RootParams,
  type UpdateParams,
} from '../../models/controllerTypes.js'
import { modelHistoryCookie, octokitTokenCookie } from '../../models/cookieNames.js'
import { ViewAndEditPermission } from '../../models/github.js'
import { MermaidSvgRender, PlainTextRender, renderedDiagramParser } from '../../models/renderedDiagram/index.js'
import { type UUID } from '../../models/strings.js'
import { Cache, type ICache } from '../../utils/cache.js'
import { filterModelByDisplayName, getRelatedIdsById } from '../../utils/dtdl/filter.js'
import { FuseSearch } from '../../utils/fuseSearch.js'
import { authRedirectURL, GithubRequest } from '../../utils/githubRequest.js'
import { SvgGenerator } from '../../utils/mermaid/generator.js'
import { dtdlIdReinstateSemicolon } from '../../utils/mermaid/helpers.js'
import { SvgMutator } from '../../utils/mermaid/svgMutator.js'
import { RateLimiter } from '../../utils/rateLimit.js'
import SessionStore, { Session } from '../../utils/sessions.js'
import { ErrorPage } from '../../views/components/errors.js'
import MermaidTemplates from '../../views/components/mermaid.js'
import { HTML, HTMLController } from '../HTMLController.js'
import { dtdlCacheKey } from '../helpers.js'

const rateLimiter = container.resolve(RateLimiter)

@injectable()
@Route('/ontology')
@Produces('text/html')
export class OntologyController extends HTMLController {
  private cookieOpts: express.CookieOptions = {
    sameSite: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    signed: true,
    secure: process.env.NODE_ENV === 'production',
  }

  constructor(
    private modelDb: ModelDb,
    private generator: SvgGenerator,
    private svgMutator: SvgMutator,
    private templates: MermaidTemplates,
    @inject(Logger) private logger: ILogger,
    @inject(Cache) private cache: ICache,
    private sessionStore: SessionStore,
    private githubRequest: GithubRequest
  ) {
    super()
    this.logger = logger.child({ controller: '/ontology' })
  }

  @SuccessResponse(200)
  @Get('{dtdlModelId}/view')
  public async view(
    @Path() dtdlModelId: UUID,
    @Queries() params: RootParams,
    @Request() req: express.Request
  ): Promise<HTML | void> {
    const { res } = req
    if (!res) {
      throw new Error('Result not found on request')
    }

    this.logger.debug(`model ${dtdlModelId} requested with search: %o`, {
      search: params.search,
    })

    let sessionId = params.sessionId

    if (!sessionId || !this.sessionStore.get(sessionId)) {
      sessionId = randomUUID()
      const session = {
        layout: 'elk' as const,
        diagramType: params.diagramType,
        search: params.search,
        highlightNodeId: params.highlightNodeId,
        expandedIds: [],
      }
      this.sessionStore.set(sessionId, session)
    }

    res.cookie(
      modelHistoryCookie,
      this.handleCookie(req.signedCookies, dtdlModelId, modelHistoryCookie),
      this.cookieOpts
    )

    const { source, owner, repo } = await this.modelDb.getModelById(dtdlModelId)
    let permission: ViewAndEditPermission = 'view'
    if (source == 'github') {
      const octokitToken = req.signedCookies[octokitTokenCookie]
      if (!octokitToken) {
        this.setStatus(302)
        this.setHeader('Location', authRedirectURL(`/ontology/${dtdlModelId}/view`))
        return
      }
      permission = await this.checkPermissions(octokitToken, owner, repo)
    }

    if (permission === 'unauthorised') {
      this.setStatus(401)
      const output = new PlainTextRender(
        'You are unauthorised to view this Ontology, Please contact the ontology owner!'
      )
      return this.html(ErrorPage(output.renderToString(), this.getStatus()))
    }

    return this.html(
      this.templates.MermaidRoot({
        search: params.search,
        sessionId,
        diagramType: params.diagramType,
        canEdit: permission === 'edit',
      })
    )
  }

  @SuccessResponse(200)
  @Middlewares(rateLimiter.strictLimitMiddleware)
  @Get('{dtdlModelId}/update-layout')
  public async updateLayout(
    @Request() req: express.Request,
    @Path() dtdlModelId: UUID,
    @Queries() params: UpdateParams
  ): Promise<HTML> {
    this.logger.debug('search: %o', { search: params.search })

    const session = this.sessionStore.get(params.sessionId)

    // get the base dtdl model that we will derive the graph from
    const { model: baseModel, fileTree } = await this.modelDb.getDtdlModelAndTree(dtdlModelId)
    const search = new FuseSearch(this.modelDb.getCollection(baseModel))

    const newSession: Session = {
      diagramType: params.diagramType,
      layout: 'elk' as const,
      search: params.search,
      expandedIds: [...session.expandedIds],
      highlightNodeId: params.highlightNodeId ?? session.highlightNodeId,
    }

    // update the new session
    if (newSession.search !== session.search) newSession.expandedIds = []

    if (newSession.highlightNodeId && params.shouldExpand) {
      newSession.expandedIds.push(newSession.highlightNodeId)
    }

    if (newSession.highlightNodeId && params.shouldTruncate && newSession.expandedIds) {
      const truncateId = dtdlIdReinstateSemicolon(newSession.highlightNodeId)
      if (newSession.expandedIds.includes(truncateId)) {
        const currentModel = params.search
          ? filterModelByDisplayName(baseModel, search, params.search, newSession.expandedIds)
          : baseModel
        newSession.expandedIds = this.truncateExpandedIds(truncateId, currentModel, newSession.expandedIds)
      }
    }

    newSession.expandedIds = [...new Set(newSession.expandedIds.map(dtdlIdReinstateSemicolon))] // remove duplicates

    // get the filtered model now we've updated the session
    const filteredModel = newSession.search
      ? filterModelByDisplayName(baseModel, search, newSession.search, newSession.expandedIds)
      : baseModel

    // if the highlighted node isn't in the filtered model don't highlight it
    if (newSession.highlightNodeId && !(dtdlIdReinstateSemicolon(newSession.highlightNodeId) in filteredModel)) {
      newSession.highlightNodeId = undefined
    }

    // get the raw mermaid generated svg
    const output = await this.generateRawOutput(dtdlModelId, filteredModel, newSession)
    const outputRawSize = output instanceof MermaidSvgRender ? output.svgRawSize : null
    const targetId = output instanceof MermaidSvgRender ? `mermaid-output` : `mermaid-output-message`

    // perform out manipulations on the svg
    const { pan, zoom } = this.manipulateOutput(output, dtdlModelId, filteredModel, session, newSession, params)

    // store the updated session
    this.sessionStore.set(params.sessionId, { ...session, ...newSession })

    // replace the current url
    const current = this.getCurrentPathQuery(req)
    if (current) {
      this.setReplaceUrl(current, params)
    }

    // render out the final components to be replaced
    return this.html(
      this.templates.mermaidTarget({
        generatedOutput: output.renderToString(),
        target: targetId,
      }),
      this.templates.searchPanel({
        search: newSession.search,
        diagramType: newSession.diagramType,
        svgWidth: params.svgWidth,
        svgHeight: params.svgHeight,
        currentZoom: zoom,
        currentPanX: pan.x,
        currentPanY: pan.y,
        swapOutOfBand: true,
      }),
      this.templates.navigationPanel({
        swapOutOfBand: true,
        entityId: dtdlIdReinstateSemicolon(newSession.highlightNodeId ?? ''),
        model: baseModel,
        expanded: true,
        edit: session.editMode!,
        tab: params.navigationPanelTab ?? (newSession.highlightNodeId ? 'details' : 'tree'),
        fileTree,
      }),
      this.templates.svgControls({
        swapOutOfBand: true,
        svgRawHeight: outputRawSize?.height,
        svgRawWidth: outputRawSize?.width,
        generatedOutput: output.renderForMinimap(),
      })
    )
  }

  @SuccessResponse(200)
  @Get('{dtdlModelId}/edit-model')
  public async editModel(
    @Path() dtdlModelId: UUID,
    @Query() sessionId: UUID,
    @Query() editMode: boolean
  ): Promise<HTML> {
    const session = this.sessionStore.get(sessionId)

    // get the base dtdl model that we will derive the graph from
    const { model: baseModel, fileTree } = await this.modelDb.getDtdlModelAndTree(dtdlModelId)

    this.sessionStore.update(sessionId, { editMode })

    return this.html(
      this.templates.navigationPanel({
        swapOutOfBand: false,
        entityId: dtdlIdReinstateSemicolon(session.highlightNodeId ?? ''),
        model: baseModel,
        expanded: session.highlightNodeId !== undefined,
        edit: editMode,
        tab: 'details',
        fileTree,
      })
    )
  }

  private getCurrentPathQuery(req: express.Request): { path: string; query: URLSearchParams } | undefined {
    const currentUrl = req.header('hx-current-url')
    if (!currentUrl) {
      return undefined
    }
    const url = new URL(currentUrl)
    return {
      path: url.pathname,
      query: url.searchParams,
    }
  }

  private setReplaceUrl(
    current: { path: string; query: URLSearchParams },
    params: { [key in UrlQueryKeys]?: string }
  ): void {
    const { path, query } = current
    for (const param of urlQueryKeys) {
      const value = params[param]
      if (Array.isArray(value)) {
        query.delete(param)
        value.forEach((item) => query.append(param, item))
        continue
      }

      if (value !== undefined) {
        query.set(param, `${value}`)
      }
    }
    this.setHeader('HX-Push-Url', `${path}?${query}`)
  }

  private manipulateOutput(
    output: MermaidSvgRender | PlainTextRender,
    dtdlModelId: UUID,
    model: DtdlObjectModel,
    oldSession: Session,
    newSession: Session,
    params: UpdateParams
  ) {
    if (output.type === 'text') {
      return {
        zoom: params.currentZoom,
        pan: { x: params.currentPanX, y: params.currentPanY },
      }
    }

    const attributeParams = {
      svgWidth: params.svgWidth,
      svgHeight: params.svgHeight,
      diagramType: newSession.diagramType,
      layout: 'elk' as const,
      highlightNodeId: newSession.highlightNodeId,
    }

    this.svgMutator.setSVGAttributes(output, model, attributeParams)
    return this.setupAnimations(
      new Set(params.a11y),
      output,
      dtdlModelId,
      oldSession,
      newSession,
      params.currentZoom,
      params.currentPanX,
      params.currentPanY,
      params.svgWidth,
      params.svgHeight
    )
  }

  // this setupAnimations handles all the animations logic we can do before going to jsdom
  // then pass through to the generator for applying the actual relevant animations
  private setupAnimations(
    a11yPrefs: Set<A11yPreference>,
    newOutput: MermaidSvgRender,
    dtdlModelId: UUID,
    oldSession: Session,
    newSession: Session,
    currentZoom: number,
    currentPanX: number,
    currentPanY: number,
    svgWidth: number,
    svgHeight: number
  ) {
    // setup an early return value if we there's no animation needed
    const withoutAnimations = {
      generatedOutput: newOutput,
      zoom: currentZoom,
      pan: { x: currentPanX, y: currentPanY },
    }

    if (a11yPrefs.has('reduce-motion')) {
      return withoutAnimations
    }

    // get the old svg from the cache
    const cacheKey = dtdlCacheKey(dtdlModelId, oldSession)
    const oldOutput = this.cache.get(cacheKey, renderedDiagramParser)

    // on a cache miss skip animations so the render isn't twice as long
    if (!oldOutput) {
      return withoutAnimations
    }

    // if old output wasn't an svg also skip
    if (oldOutput.type !== 'svg') {
      return withoutAnimations
    }

    // if the diagram type is different don't animate
    if (oldSession.diagramType !== newSession.diagramType) {
      return withoutAnimations
    }

    // if the sessions are identical except for the highlighted node skip the animations as the view transition is sufficient
    if (
      oldSession.diagramType === newSession.diagramType &&
      oldSession.layout === newSession.layout &&
      oldSession.search === newSession.search &&
      oldSession.expandedIds.length === newSession.expandedIds.length &&
      oldSession.expandedIds.every((id, index) => id === newSession.expandedIds[index])
    ) {
      return withoutAnimations
    }

    // looks like we need to modify the svg to setup animations
    return this.svgMutator.setupAnimations(
      newSession,
      newOutput,
      oldOutput,
      currentZoom,
      currentPanX,
      currentPanY,
      svgWidth,
      svgHeight
    )
  }

  private async generateRawOutput(
    dtdlModelId: UUID,
    model: DtdlObjectModel,
    session: GenerateParams
  ): Promise<MermaidSvgRender | PlainTextRender> {
    const cacheKey = dtdlCacheKey(dtdlModelId, session)
    const fromCache = this.cache.get(cacheKey, renderedDiagramParser)
    if (fromCache) {
      return fromCache
    }
    const output = await this.generator.run(model, session.diagramType, session.layout)
    this.cache.set(cacheKey, output)

    return output
  }

  private truncateExpandedIds(truncateId: string, model: DtdlObjectModel, expandedIds: string[]): string[] {
    const relatedIds = getRelatedIdsById(model, truncateId)
    const truncateIdIndex = expandedIds.findIndex((id) => id === truncateId)

    // Create a set of expandedIds before truncateIdIndex for quick lookup
    const expandedIdsBeforeTruncate = new Set(expandedIds.slice(0, truncateIdIndex))

    return expandedIds.filter((expandedId, index) => {
      // Remove the truncating ID itself
      if (expandedId === truncateId) return false

      // Check if the expandedId is related and appears after the truncating ID
      if (relatedIds.has(expandedId) && index >= truncateIdIndex) {
        /* 
          Check if any related ID exists before the truncating expandedId, 
          This will keep this expandedId in, as it was brought into scope by another node before the truncated node
        */
        const hasMatchBeforeTruncate = [...getRelatedIdsById(model, expandedId)].some((value) =>
          expandedIdsBeforeTruncate.has(value)
        )
        if (hasMatchBeforeTruncate) return true

        // Add additional related IDs to the set
        getRelatedIdsById(model, expandedId).forEach((value) => relatedIds.add(value))

        return false
      }

      // Keep unrelated or earlier IDs
      return true
    })
  }

  private handleCookie(
    cookies: Record<string, CookieHistoryParams[]>,
    dtdlModelId: UUID,
    cookieName: string
  ): CookieHistoryParams[] {
    const MAX_HISTORY = 6
    const timestamp = Date.now()

    let cookieHistory: CookieHistoryParams[] = cookies[cookieName] || []

    const existingIndex = cookieHistory.findIndex((item) => item.id === dtdlModelId)

    if (existingIndex !== -1) {
      cookieHistory[existingIndex].timestamp = timestamp
    } else {
      cookieHistory.push({ id: dtdlModelId, timestamp: timestamp })

      if (cookieHistory.length > MAX_HISTORY) {
        cookieHistory = cookieHistory.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY)
      }
    }

    return cookieHistory
  }

  private async checkPermissions(
    octokitToken: string,
    owner: string | null,
    repo: string | null
  ): Promise<ViewAndEditPermission> {
    if (!owner || !repo) {
      throw new InternalError('owner or repo not found in database for GitHub source')
    }

    return await this.githubRequest.getRepoPermissions(octokitToken, owner, repo)
  }
}
