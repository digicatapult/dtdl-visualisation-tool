import { Get, Produces, Query, Route, SuccessResponse } from 'tsoa'
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
  constructor(
    private dtdlLoader: DtdlLoader,
    private templates: MermaidTemplates,
    private flowchart: Flowchart,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/' })
    this.flowchart = new Flowchart()
  }

  @SuccessResponse(200)
  @Get('/')
  public async get(): Promise<HTML> {
    this.logger.debug('root page requested')

    return this.html(
      this.templates.MermaidRoot({
        graph: this.flowchart.getFlowchartMarkdown(this.dtdlLoader.getDefaultDtdlModel(), Direction.TopToBottom),
      })
    )
  }

  @SuccessResponse(200)
  @Get('/update-layout')
  public async layoutButton(@Query() layout: Layout = 'dagre'): Promise<HTML> {
    return this.html(
      this.templates.mermaidMarkdown({
        graph: this.flowchart.getFlowchartMarkdown(this.dtdlLoader.getDefaultDtdlModel(), Direction.TopToBottom),
        layout: layout,
      })
    )
  }

  @SuccessResponse(200)
  @Get('/entity/{id}')
  public async getEntityById(id: string, @Query() chartType?: string): Promise<HTML> {
    let entityId = id
    if (chartType === 'mermaid') entityId = this.flowchart.dtdlIdReintroduceSemicolon(id)
    const entity = this.dtdlLoader.getDefaultDtdlModel()[entityId]
    return this.html(`${JSON.stringify(entity, null, 4)}`)
  }
}
