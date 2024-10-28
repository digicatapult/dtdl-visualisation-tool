import express from 'express'
import { Get, Produces, Queries, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { type ILogger, Logger } from '../logger.js'
import { type QueryParams } from '../models/contollerTypes.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
import { filterModelByDisplayName } from '../utils/dtdl/filter.js'
import Flowchart from '../utils/mermaid/flowchart.js'
import { SvgGenerator } from '../utils/mermaid/generator.js'
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
    private generator: SvgGenerator,
    private templates: MermaidTemplates,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.flowchart = new Flowchart()
    this.logger = logger.child({ controller: '/' })
  }

  @SuccessResponse(200)
  @Get('/')
  public async get(@Queries() params: QueryParams): Promise<HTML> {
    this.logger.debug('root page requested with search: %o', { search: params.search, layout: params.layout })

    return this.html(
      this.templates.MermaidRoot({
        layout: params.layout,
        search: params.search,
        highlightNodeId: params.highlightNodeId,
      })
    )
  }

  @SuccessResponse(200)
  @Get('/update-layout')
  public async updateLayout(@Request() req: express.Request, @Queries() params: QueryParams): Promise<HTML> {
    this.logger.debug('search: %o', { search: params.search, layout: params.layout })

    const current = this.getCurrentPathQuery(req)
    if (current) {
      this.setReplaceUrl(current, params)
    }

    let model = this.dtdlLoader.getDefaultDtdlModel()
    if (params.search) {
      model = filterModelByDisplayName(model, params.search)
    }

    return this.html(
      this.templates.mermaidTarget({
        generatedOutput: await this.generator.run(model, params),
        target: 'mermaid-output',
      }),
      this.templates.layoutForm({
        layout: params.layout,
        swapOutOfBand: true,
        search: params.search,
        highlightNodeId: params.highlightNodeId,
      })
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

  private setReplaceUrl(current: { path: string; query: URLSearchParams }, params: QueryParams): void {
    const { path, query } = current
    for (const param in params) {
      query.set(param, params[param])
    }
    this.setHeader('HX-Push-Url', `${path}?${query}`)
  }
}
