import express from 'express'
import { Get, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { type ILogger, Logger } from '../logger.js'
import { type Layout } from '../models/mermaidLayouts.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
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
    this.flowchart = new Flowchart(dtdlLoader.getDefaultDtdlModel())
    this.logger = logger.child({ controller: '/' })
  }

  @SuccessResponse(200)
  @Get('/')
  public async get(@Query() layout: Layout = 'dagre-d3'): Promise<HTML> {
    this.logger.debug('root page requested')

    return this.html(
      this.templates.MermaidRoot({
        graph: this.flowchart.getFlowchartMarkdown(Direction.TopToBottom),
        layout,
      })
    )
  }

  @SuccessResponse(200)
  @Get('/update-layout')
  public async updateLayout(@Request() req: express.Request, @Query() layout: Layout = 'dagre-d3'): Promise<HTML> {
    this.logger.debug('search: %o', { layout, originalUrl: req.originalUrl })

    const current = this.getCurrentPathQuery(req)
    if (current) {
      const { path, query } = current
      query.set('layout', layout)
      this.setHeader('HX-Replace-Url', `${path}?${query}`)
    }

    return this.html(
      this.templates.mermaidMarkdown({
        graph: this.flowchart.getFlowchartMarkdown(Direction.TopToBottom),
        layout: layout,
      }),
      this.templates.layoutForm({ layout, swapOutOfBand: true })
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
}
