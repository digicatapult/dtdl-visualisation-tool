import { NextFunction, Request, Response } from 'express'
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit'
import { inject, singleton } from 'tsyringe'
import { Env } from '../env/index.js'
import { TooManyRequestsError } from '../errors.js'

@singleton()
export class RateLimiter {
  private strict: RateLimitRequestHandler
  public global: RateLimitRequestHandler

  constructor(@inject(Env) private env: Env) {
    this.strict = rateLimit({
      windowMs: this.env.get('RATE_LIMIT_WINDOW_MS'),
      limit: this.env.get('STRICT_RATE_LIMIT'),
      skip: (req: Request) => this.env.get('IP_ALLOW_LIST').includes(req.ip!),
      handler: (req: Request, res: Response) => {
        const error = new TooManyRequestsError(`${req.ip} blocked - please try again later.`)
        res.status(error.code).send(error.message)
      },
    })

    this.global = rateLimit({
      windowMs: this.env.get('RATE_LIMIT_WINDOW_MS'),
      limit: this.env.get('GLOBAL_RATE_LIMIT'),
      skip: (req: Request) => this.env.get('IP_ALLOW_LIST').includes(req.ip!),
      handler: (req: Request, res: Response) => {
        const error = new TooManyRequestsError(`${req.ip} blocked - please try again later.`)
        res.status(error.code).send(error.message)
      },
    })
  }

  public strictLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    this.strict(req, res, next)
  }
}
