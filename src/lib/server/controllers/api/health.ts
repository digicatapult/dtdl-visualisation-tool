import express from 'express'
import { Get, Hidden, Request, Route, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'
import version from '../../../../version.js'

@injectable()
@Route('/api/health')
@Hidden()
export class HealthController {
  @SuccessResponse(200)
  @Get('/')
  public get(@Request() req: express.Request): { version: string } {
    req.log.info('request from %s agent', req?.headers['user-agent'])

    return { version }
  }
}
