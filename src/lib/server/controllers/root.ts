import { Get, Produces, Route, SuccessResponse, Request } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import type * as express from 'express'
import { type ILogger, Logger } from '../logger.js'
import Flowchart, {Direction} from '../utils/mermaid/flowchart.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { HTML, HTMLController } from './HTMLController.js'
import { parseDirectories } from '../../parser/index.js'
import { getInterop } from '../../parser/interop.js'
import { parseError } from '../views/common.js'

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

    const parser = await getInterop()
    const parsedDtdl = await parseDirectories(req.app.get('dtdl-path'), parser)
    if (parsedDtdl) {
      return this.html(this.templates.flowchart({ graph: this.flowchart.getFlowchartMarkdown(parsedDtdl, Direction.TopToBottom) }))
    }
    return this.html(parseError({path:req.app.get('dtdl-path')}))
  }
    
  
}
