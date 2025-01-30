import { Get, Produces, Queries, Query, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { Logger, type ILogger } from '../logger.js'
import { type RootParams } from '../models/controllerTypes.js'
import { DtdlLoader } from '../utils/dtdl/dtdlLoader.js'
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
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/' })
  }

  @SuccessResponse(302, 'Redirect')
  @Get('/')
  public async get(@Queries() params: RootParams): Promise<void> {
    this.logger.debug('default model requested')

    this.setHeader('Location', `/ontology/${this.dtdlLoader.getDefaultId()}/view?${new URLSearchParams({ ...params })}`)
    return
  }

  @SuccessResponse(200)
  @Get('/legend')
  public async getLegend(@Query() showContent: boolean): Promise<HTML> {
    return this.html(this.templates.Legend({ showContent }))
  }
}
