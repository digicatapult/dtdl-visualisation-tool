import { DtdlObjectModel, EntityType } from '@digicatapult/dtdl-parser'
import express from 'express'
import { Get, Produces, Queries, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { Logger, type ILogger } from '../logger.js'
import { urlQueryKeys, UrlQueryKeys, type RootParams, type UpdateParams } from '../models/controllerTypes.js'
import { Cache, type ICache } from '../utils/cache.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { filterModelByDisplayName, getRelatedIdsById } from '../utils/dtdl/filter.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import { dtdlIdReinstateSemicolon } from '../utils/mermaid/helpers.js'
import { Search, type ISearch } from '../utils/search.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'

const relevantParams = ['search', 'diagramType', 'layout', 'expandedIds']

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
    @inject(Cache) private cache: ICache
  ) {
    super()
    this.logger = logger.child({ controller: '/' })
  }

  @SuccessResponse(200)
  @Get('/')
  public async get(@Queries() params: RootParams): Promise<HTML> {
    this.logger.debug('root page requested with search: %o', { search: params.search, layout: params.layout })

    return this.html(
      this.templates.MermaidRoot({
        layout: params.layout,
        search: params.search,
        highlightNodeId: params.highlightNodeId,
        expandedIds: params.expandedIds,
        diagramType: params.diagramType,
        lastSearch: params.lastSearch,
      })
    )
  }

  @SuccessResponse(200)
  @Get('/update-layout')
  public async updateLayout(@Request() req: express.Request, @Queries() params: UpdateParams): Promise<HTML> {
    this.logger.debug('search: %o', { search: params.search, layout: params.layout })

    if (params.search !== params.lastSearch) params.expandedIds = []

    if (params.highlightNodeId && params.shouldExpand) {
      params.expandedIds = params.expandedIds || []
      params.expandedIds.push(params.highlightNodeId)
    }

    const model = this.dtdlLoader.getDefaultDtdlModel()

    if (params.highlightNodeId && params.shouldTruncate && params.expandedIds) {
      const truncateId = dtdlIdReinstateSemicolon(params.highlightNodeId)
      if (params.expandedIds.includes(truncateId)) {
        const currentModel = params.search
          ? filterModelByDisplayName(model, this.search, params.search, params.expandedIds)
          : model
        params.expandedIds = this.truncateExpandedIds(truncateId, currentModel, params.expandedIds)
      }
    }

    params.expandedIds = [...new Set(params.expandedIds?.map(dtdlIdReinstateSemicolon))] // remove duplicates

    const cacheKey = this.createCacheKey(params)
    const generatedOutput = await this.generateOutput(params, cacheKey)

    const current = this.getCurrentPathQuery(req)
    if (current) {
      this.setReplaceUrl(current, params)
    }

    return this.html(
      this.templates.mermaidTarget({
        generatedOutput,
        target: 'mermaid-output',
      }),
      this.templates.searchPanel({
        layout: params.layout,
        swapOutOfBand: true,
        search: params.search,
        highlightNodeId: params.highlightNodeId,
        expandedIds: params.expandedIds,
        diagramType: params.diagramType,
        lastSearch: params.search,
        svgWidth: params.svgWidth,
        svgHeight: params.svgHeight,
      }),
      this.templates.navigationPanel({
        swapOutOfBand: true,
        entityId: dtdlIdReinstateSemicolon(params.highlightNodeId ?? ''),
        model: this.dtdlLoader.getDefaultDtdlModel(),
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
    params: { [key in UrlQueryKeys]?: string | string[] | boolean }
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

  private createCacheKey(queryParams: UpdateParams): string {
    const searchParams = new URLSearchParams(queryParams as unknown as Record<string, string>)
    for (const key of Array.from(searchParams.keys())) {
      if (!relevantParams.includes(key)) {
        searchParams.delete(key)
      }
    }
    searchParams.sort()
    return searchParams.toString()
  }

  private async generateOutput(params: UpdateParams, cacheKey: string): Promise<string> {
    const fromCache = this.cache.get(cacheKey)
    if (fromCache) {
      return this.generator.setSVGAttributes(fromCache, params)
    }

    const model = params.search
      ? filterModelByDisplayName(
          this.dtdlLoader.getDefaultDtdlModel(),
          this.search,
          params.search,
          params.expandedIds ?? []
        )
      : this.dtdlLoader.getDefaultDtdlModel()

    if (params.highlightNodeId && !(dtdlIdReinstateSemicolon(params.highlightNodeId) in model)) {
      params.highlightNodeId = undefined
    }

    const output = await this.generator.run(model, params.diagramType, params.layout)
    this.cache.set(cacheKey, output)
    return this.generator.setSVGAttributes(output, params)
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
