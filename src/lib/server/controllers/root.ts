import express from 'express'
import { Get, Produces, Queries, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { Logger, type ILogger } from '../logger.js'
import { urlQueryKeys, UrlQueryKeys, type RootParams, type UpdateParams } from '../models/controllerTypes.js'
import { Cache, type ICache } from '../utils/cache.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { filterModelByDisplayName } from '../utils/dtdl/filter.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
import { dtdlIdReinstateSemicolon } from '../utils/mermaid/helpers.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'

const relevantParams = ['search', 'highlightNodeId', 'diagramType', 'layout', 'output', 'expandedIds']

@singleton()
@injectable()
@Route()
@Produces('text/html')
export class RootController extends HTMLController {
  constructor(
    private dtdlLoader: DtdlLoader,
    private generator: SvgGenerator,
    private templates: MermaidTemplates,
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
    params.expandedIds = [...new Set(params.expandedIds?.map(dtdlIdReinstateSemicolon))] // remove duplicates

    const cacheKey = this.createCacheKey(params)
    const generatedOutput = this.cache.get(cacheKey) ?? (await this.generateOutput(params, cacheKey))

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
    let model = this.dtdlLoader.getDefaultDtdlModel()

    if (params.search) {
      model = filterModelByDisplayName(model, params.search, params.expandedIds ?? [])
    }

    if (params.highlightNodeId && !(dtdlIdReinstateSemicolon(params.highlightNodeId) in model)) {
      params.highlightNodeId = undefined
    }

    const output = await this.generator.run(model, params)
    this.cache.set(cacheKey, output)
    return output
  }
}
