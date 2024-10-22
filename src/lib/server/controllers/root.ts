import express from 'express'
import { Get, Produces, Query, Queries, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { type ILogger, Logger } from '../logger.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { Generator } from '../utils/mermaid/generator.js'
import Flowchart from '../utils/mermaid/flowchart.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'
import { Layout } from '../models/mermaidLayouts.js'
import { MermaidId } from '../models/strings.js'

export interface QueryParams {
  layout: Layout
  chartType: 'flowchart'
  output: 'svg' | 'png' | 'pdf'
  highlightNodeId?: MermaidId
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
    this.flowchart = new Flowchart(dtdlLoader.getDefaultDtdlModel())
    this.logger = logger.child({ controller: '/' })
  }

  @SuccessResponse(200)
  @Get('/')
  public async get(
    @Queries() params: QueryParams
  ): Promise<HTML> {
    this.logger.debug('root page requested')

    return this.html(
      this.templates.MermaidRoot({
        layout: params.layout ? params.layout : 'dagre-d3'
      })
    )
  }

  @SuccessResponse(200)
  @Get('/update-layout')
  public async updateLayout(@Request() req: express.Request, @Queries() params: QueryParams = { layout: 'dagre-d3', chartType: 'flowchart', output: 'svg' }): Promise<HTML> {
    this.logger.debug('search: %o', { layout: params.layout, originalUrl: req.originalUrl })

    const current = this.getCurrentPathQuery(req)
    if (current) {
      const { path, query } = current
      for (const param in params) {
        query.set(param, params[param])
      }

      this.setHeader('HX-Replace-Url', `${path}?${query}`)
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
}
