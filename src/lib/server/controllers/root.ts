import { DtdlObjectModel, EntityType } from '@digicatapult/dtdl-parser'
import { randomUUID } from 'crypto'
import express from 'express'
import { Get, Produces, Queries, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { InvalidQueryError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'
import {
  GenerateParams,
  relevantParams,
  urlQueryKeys,
  UrlQueryKeys,
  type RootParams,
  type UpdateParams,
} from '../models/controllerTypes.js'
import { Cache, type ICache } from '../utils/cache.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { filterModelByDisplayName, getRelatedIdsById } from '../utils/dtdl/filter.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import { dtdlIdReinstateSemicolon } from '../utils/mermaid/helpers.js'
import { Search, type ISearch } from '../utils/search.js'
import SessionStore, { Session } from '../utils/sessions.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'

@singleton()
@injectable()
@Route()
@Produces('text/html')
export class RootController extends HTMLController {
  constructor(
    private dtdlLoader: DtdlLoader,
    private generator: SvgGenerator,
    private templates: MermaidTemplates,
    @inject(Search) private search: ISearch<EntityType>,
    @inject(Logger) private logger: ILogger,
    @inject(Cache) private cache: ICache,
    private sessionStore: SessionStore
  ) {
    super()
    this.logger = logger.child({ controller: '/' })
  }

  @SuccessResponse(200)
  @Get('/')
  public async get(@Queries() params: RootParams): Promise<HTML> {
    this.logger.debug('root page requested with search: %o', { search: params.search, layout: params.layout })

    const sessionId = randomUUID()
    const session = {
      layout: params.layout,
      diagramType: params.diagramType,
      search: params.search,
      highlightNodeId: params.highlightNodeId,
      expandedIds: [],
    }
    this.sessionStore.set(sessionId, session)

    return this.html(
      this.templates.MermaidRoot({
        layout: params.layout,
        search: params.search,
        sessionId,
        diagramType: params.diagramType,
      })
    )
  }

  @SuccessResponse(200)
  @Get('/update-layout')
  public async updateLayout(@Request() req: express.Request, @Queries() params: UpdateParams): Promise<HTML> {
    this.logger.debug('search: %o', { search: params.search, layout: params.layout })

    // get the base dtdl model that we will derive the graph from
    const baseModel = this.dtdlLoader.getDefaultDtdlModel()

    // pull out the stored session. If this is invalid the request is invalid
    const session = this.sessionStore.get(params.sessionId)
    if (!session) {
      throw new InvalidQueryError('Session is not valid')
    }
    const newSession: Session = {
      diagramType: params.diagramType,
      layout: params.layout,
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
          ? filterModelByDisplayName(baseModel, this.search, params.search, newSession.expandedIds)
          : baseModel
        newSession.expandedIds = this.truncateExpandedIds(truncateId, currentModel, newSession.expandedIds)
      }
    }

    newSession.expandedIds = [...new Set(newSession.expandedIds.map(dtdlIdReinstateSemicolon))] // remove duplicates

    // get the filtered model now we've updated the session
    const filteredModel = newSession.search
      ? filterModelByDisplayName(baseModel, this.search, newSession.search, newSession.expandedIds)
      : baseModel

    // if the highlighted node isn't in the filtered model don't highlight it
    if (newSession.highlightNodeId && !(dtdlIdReinstateSemicolon(newSession.highlightNodeId) in filteredModel)) {
      newSession.highlightNodeId = undefined
    }

    // get the raw mermaid generated svg
    const rawOutput = await this.generateRawOutput(filteredModel, newSession)

    // set attributes to produce the final generated output
    const attributeParams = {
      svgWidth: params.svgWidth,
      svgHeight: params.svgHeight,
      diagramType: newSession.diagramType,
      highlightNodeId: newSession.highlightNodeId,
    }
    const generatedOutput = this.generator.setSVGAttributes(rawOutput, attributeParams)

    // store the updated session
    this.sessionStore.set(params.sessionId, newSession)

    // replace the current url
    const current = this.getCurrentPathQuery(req)
    if (current) {
      this.setReplaceUrl(current, params)
    }

    // render out the final components to be replaced
    return this.html(
      this.templates.mermaidTarget({
        generatedOutput,
        target: 'mermaid-output',
      }),
      this.templates.searchPanel({
        layout: newSession.layout,
        search: newSession.search,
        diagramType: newSession.diagramType,
        sessionId: params.sessionId,
        svgWidth: params.svgWidth,
        svgHeight: params.svgHeight,
        currentZoom: params.currentZoom,
        currentPanX: params.currentPanX,
        currentPanY: params.currentPanY,
        swapOutOfBand: true,
      }),
      this.templates.navigationPanel({
        swapOutOfBand: true,
        entityId: dtdlIdReinstateSemicolon(newSession.highlightNodeId ?? ''),
        model: baseModel,
      })
    )
  }

  @SuccessResponse(200)
  @Get('/legend')
  public async getLegend(@Query() showContent: boolean): Promise<HTML> {
    return this.html(this.templates.Legend({ showContent }))
  }

  @SuccessResponse(200)
  @Get('/entity/{id}')
  public async getEntityById(id: string): Promise<HTML> {
    const entityId = dtdlIdReinstateSemicolon(id)
    const entity = this.dtdlLoader.getDefaultDtdlModel()[entityId]
    return this.html(`${JSON.stringify(entity, null, 4)}`)
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

  private createCacheKey(queryParams: GenerateParams): string {
    const searchParams = new URLSearchParams()
    for (const key of relevantParams) {
      const value = queryParams[key]
      if (value === undefined) {
        continue
      }

      if (!Array.isArray(value)) {
        searchParams.set(key, value)
        continue
      }
      value.forEach((v) => searchParams.append(key, v))
    }

    searchParams.sort()
    return searchParams.toString()
  }

  private async generateRawOutput(model: DtdlObjectModel, session: GenerateParams): Promise<string> {
    const cacheKey = this.createCacheKey(session)
    const fromCache = this.cache.get(cacheKey)
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
}
