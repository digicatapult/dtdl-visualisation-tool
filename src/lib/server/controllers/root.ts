import type * as express from 'express'
import { Get, Produces, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { type ILogger, Logger } from '../logger.js'
import Flowchart, { Direction } from '../utils/mermaid/flowchart.js'
import { parseError } from '../views/common.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'

@singleton()
@injectable()
@Route()
@Produces('text/html')
export class RootController extends HTMLController {
  constructor(
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
  public async get(@Request() req: express.Request): Promise<HTML> {
    this.logger.debug('root page requested')

    if (req.app.get('dtdl')) {
      return this.html(
        this.templates.flowchart({
          graph: this.flowchart.getFlowchartMarkdown(req.app.get('dtdl'), Direction.TopToBottom),
        })
      )
    }
    return this.html(parseError({ path: req.app.get('dtdl-path') }))
  }
}
