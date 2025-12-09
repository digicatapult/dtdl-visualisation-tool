import { NextFunction, Request, Response } from 'express'
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit'
import { container, inject, singleton } from 'tsyringe'
import { Env } from '../env/index.js'
import { TooManyRequestsError } from '../errors.js'
import { octokitTokenCookie, posthogIdCookie } from '../models/cookieNames.js'
import { errorToast } from '../views/components/errors.js'
import { PostHogService } from './postHog/postHogService.js'

@singleton()
export class RateLimiter {
  private strict: RateLimitRequestHandler
  public global: RateLimitRequestHandler

  constructor(@inject(Env) private env: Env) {
    this.strict = rateLimit({
      windowMs: this.env.get('RATE_LIMIT_WINDOW_MS'),
      limit: this.env.get('STRICT_RATE_LIMIT'),
      skip: (req: Request) => this.env.get('IP_ALLOW_LIST').includes(req.ip!),
      handler: this.handleRateLimitExceeded.bind(this),
    })

    this.global = rateLimit({
      windowMs: this.env.get('RATE_LIMIT_WINDOW_MS'),
      limit: this.env.get('GLOBAL_RATE_LIMIT'),
      skip: (req: Request) => this.env.get('IP_ALLOW_LIST').includes(req.ip!),
      handler: this.handleRateLimitExceeded.bind(this),
    })
  }

  private handleRateLimitExceeded(req: Request, res: Response): void {
    const error = new TooManyRequestsError(`${req.ip} blocked - please try again later.`)
    const toast = errorToast(error)
    const code = error.code

    // Track error in PostHog asynchronously without blocking response
    try {
      const postHog = container.resolve(PostHogService)
      const octokitToken = req.signedCookies[octokitTokenCookie]
      const posthogId = req.signedCookies[posthogIdCookie]

      if (posthogId) {
        postHog
          .trackError(octokitToken, posthogId, {
            message: error.message,
            stack: error.stack,
            code: code,
            path: req.path,
            method: req.method,
          })
          .catch((trackingErr) => {
            req.log.debug({ trackingErr }, 'Failed to track error in PostHog')
          })
      }
    } catch (err) {
      // PostHog not available (e.g., in tests) - continue without tracking
      req.log?.debug({ err }, 'PostHog service not available for rate limit error tracking')
    }

    res.setHeader('HX-Reswap', 'innerHTML')
    // really ugly workaround for https://github.com/bigskysoftware/htmx/issues/2518
    res.setHeader('HX-Reselect', ':not(* > *)')
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('HX-Trigger-After-Settle', JSON.stringify({ dtdlVisualisationError: { dialogId: toast.dialogId } }))
    res.status(code).send(toast.response)
  }

  public strictLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    this.strict(req, res, next)
  }
}
