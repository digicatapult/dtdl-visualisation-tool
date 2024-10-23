import express from 'express'
import { Get, Produces, Query, Queries, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { type ILogger, Logger } from '../logger.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { Generator } from '../utils/mermaid/generator.js'
import Flowchart from '../utils/mermaid/flowchart.js'
import { filterModelByDisplayName } from '../utils/dtdl/filter.js'
import Flowchart, { Direction } from '../utils/mermaid/flowchart.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'
import { Layout } from '../models/mermaidLayouts.js'
import { MermaidId } from '../models/strings.js'

export interface QueryParams {
  layout: Layout
  chartType: 'flowchart'
  output: 'svg' | 'png' | 'pdf'
  highlightNodeId?: MermaidId
  search?: string
}

const paramsDefault: QueryParams = {
  layout: 'dagre-d3',
  chartType: 'flowchart',
  output: 'svg'
}

@singleton()
@injectable()
@Route()
@Produces('text/html')
export class RootController extends HTMLController {
  private flowchart: Flowchart

  constructor(
    private dtdlLoader: DtdlLoader,
    private generator: Generator,
    private templates: MermaidTemplates,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.flowchart = new Flowchart()
    this.logger = logger.child({ controller: '/' })
  }

  @SuccessResponse(200)
  @Get('/')
  public async get(@Queries() params: QueryParams = paramsDefault): Promise<HTML> {
    this.logger.debug('root page requested with search: %o', { params.layout, params.search })

    let model = this.dtdlLoader.getDefaultDtdlModel()
    if (params.search) {
      model = filterModelByDisplayName(model, params.search)
    }

    return this.html(
      this.templates.MermaidRoot({
        generatedOutput: await this.generator.run(model, params),
        search: params.search,
        layout: params.layout,
      })
    )
  }

  @SuccessResponse(200)
  @Get('/update-layout')
  public async updateLayout(
    @Request() req: express.Request,
    @Queries() params: QueryParams = { layout: 'dagre-d3', chartType: 'flowchart', output: 'svg' }
  ): Promise<HTML> {
    this.logger.debug('search: %o', { params.search, params.layout })

    const current = this.getCurrentPathQuery(req)
    if (current) {
      this.setReplaceUrl(current, params.layout, params.search)
    }

    let model = this.dtdlLoader.getDefaultDtdlModel()
    if (params.search) {
      model = filterModelByDisplayName(model, params.search)
    }

    return this.html(
      this.templates.mermaidTarget({
        generatedOutput: (await this.generator.run(this.dtdlLoader.getDefaultDtdlModel(), params)),
        target: 'mermaid-output'
      }),
      this.templates.layoutForm({ layout: params.layout, swapOutOfBand: true })
    )
  }

  @SuccessResponse(200)
  @Get('/entity/{id}')
  public async getEntityById(id: string, @Query() chartType?: string): Promise<HTML> {
    let entityId = id
    if (chartType === 'flowchart') entityId = this.flowchart.dtdlIdReinstateSemicolon(id)
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
