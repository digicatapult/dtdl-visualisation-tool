import { Get, Produces, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { type ILogger, Logger } from '../logger.js'
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
      this.templates.flowchart({
        graph: this.flowchart.getFlowchartMarkdown(this.dtdlLoader.getDefaultDtdlModel(), Direction.TopToBottom),
      })
    )
  }
}
