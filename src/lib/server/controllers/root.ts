import express from 'express'
import { Get, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { type ILogger, Logger } from '../logger.js'
import { type Layout } from '../models/mermaidLayouts.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { filterModelByDisplayName } from '../utils/dtdl/filter.js'
import Flowchart, { Direction } from '../utils/mermaid/flowchart.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'

@singleton()
@injectable()
@Route()
@Produces('text/html')
export class RootController extends HTMLController {
  private flowchart: Flowchart

  constructor(
    private dtdlLoader: DtdlLoader,
    private templates: MermaidTemplates,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.flowchart = new Flowchart()
    this.logger = logger.child({ controller: '/' })
  }

  @SuccessResponse(200)
  @Get('/')
  public async get(@Query() layout: Layout = 'dagre-d3', @Query() search?: string): Promise<HTML> {
    this.logger.debug('root page requested with search: %o', { layout, search })

    let model = this.dtdlLoader.getDefaultDtdlModel()
    if (search) {
      model = filterModelByDisplayName(model, search)
    }

    return this.html(
      this.templates.MermaidRoot({
        graph: this.flowchart.getFlowchartMarkdown(model, Direction.TopToBottom),
        search,
        layout,
      })
    )
  }

  @SuccessResponse(200)
  @Get('/update-layout')
  public async updateLayout(
    @Request() req: express.Request,
    @Query() layout: Layout = 'dagre-d3',
    @Query() search?: string
  ): Promise<HTML> {
    this.logger.debug('search: %o', { search, layout })

    const current = this.getCurrentPathQuery(req)
    if (current) {
      this.setReplaceUrl(current, layout, search)
    }

    let model = this.dtdlLoader.getDefaultDtdlModel()
    if (search) {
      model = filterModelByDisplayName(model, search)
    }

    return this.html(
      this.templates.mermaidMarkdown({
        graph: this.flowchart.getFlowchartMarkdown(model, Direction.TopToBottom),
        layout: layout,
      }),
      this.templates.layoutForm({ search, layout, swapOutOfBand: true })
    )
  }

  @SuccessResponse(200)
  @Get('/entity/{id}')
  public async getEntityById(id: string, @Query() chartType?: string): Promise<HTML> {
    let entityId = id
    if (chartType === 'mermaid') entityId = this.flowchart.dtdlIdReinstateSemicolon(id)
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

  private setReplaceUrl(current: { path: string; query: URLSearchParams }, layout: Layout, search?: string): void {
    const { path, query } = current
    query.set('layout', layout)
    if (search) {
      query.set('search', search)
    }
    this.setHeader('HX-Push-Url', `${path}?${query}`)
  }
}
