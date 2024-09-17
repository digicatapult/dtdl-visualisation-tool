import { Get, Produces, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { type ILogger, Logger } from '../logger.js'

@singleton()
@injectable()
@Route()
@Produces('text/hmtl')
export class RootController {

    constructor(
        @inject(Logger) private logger: ILogger
    ){
        this.logger = logger.child({ controller: '/' })
    }

    @SuccessResponse(200)
    @Get('/')
    public async get(): Promise<string> {
      this.logger.debug('root page requested')
      return 'Hello, World'  
    } 
}