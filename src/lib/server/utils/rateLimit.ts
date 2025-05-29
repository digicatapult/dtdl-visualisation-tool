import { NextFunction, Request, Response } from 'express'
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit'
import { injectable } from 'tsyringe'
import { Env } from '../env/index.js'
import { TooManyRequestsError } from '../errors.js'

@injectable()
export class RateLimiter {
  private allowList = ['193.221.133.170']
  private strictLimit: RateLimitRequestHandler
  public globalLimit: RateLimitRequestHandler

  constructor(private env: Env) {
    this.strictLimit = rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: this.env.get('STRICT_RATE_LIMIT'),
      skip: (req) => this.allowList.includes(req.ip!),
      handler: (req: Request) => {
        console.log(req.ip)
        throw new TooManyRequestsError('Please try again later.')
      },
    })

    this.globalLimit = rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: this.env.get('GLOBAL_RATE_LIMIT'),
      skip: (req) => this.allowList.includes(req.ip!),
      handler: (req: Request) => {
        console.log(req.ip)
        throw new TooManyRequestsError('Please try again later.')
      },
    })
  }

  public strictLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    this.strictLimit(req, res, next)
  }
}
