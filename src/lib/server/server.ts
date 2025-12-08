import bodyParser from 'body-parser'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Express } from 'express'
import multer from 'multer'
import requestLogger from 'pino-http'
import { ValidateError } from 'tsoa'
import { container } from 'tsyringe'
import { Env } from './env/index.js'
import { HttpError, SessionError, UploadError } from './errors.js'
import { logger } from './logger.js'
import { octokitTokenCookie, posthogIdCookie } from './models/cookieNames.js'
import { RegisterRoutes } from './routes.js'
import { PostHogService } from './utils/postHog/postHogService.js'
import { RateLimiter } from './utils/rateLimit.js'
import { errorToast } from './views/components/errors.js'

export default async (): Promise<Express> => {
  const env = container.resolve(Env)
  const rateLimit = container.resolve(RateLimiter)

  const app: Express = express()

  app.use(
    requestLogger({
      logger,
    })
  )

  app.use(cors())
  app.use(compression())

  const multerOptions = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: env.get('UPLOAD_LIMIT_MB') * 1024 * 1024,
    },
  })
  app.use(cookieParser(env.get('COOKIE_SESSION_KEYS')))
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())

  app.use('/public', express.static('public'))
  app.use('/lib/htmx.org', express.static('node_modules/htmx.org/dist'))
  app.use('/lib/htmx-ext-json-enc/json-enc.js', express.static('node_modules/htmx-ext-json-enc/json-enc.js'))
  app.use(
    '/lib/htmx-ext-response-targets/response-targets.js',
    express.static('node_modules/htmx-ext-response-targets/response-targets.js')
  )
  app.use('/lib/svg-pan-zoom', express.static('node_modules/svg-pan-zoom/dist'))

  app.use(rateLimit.global)
  RegisterRoutes(app, { multer: multerOptions })

  app.use(function errorHandler(
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    if (err instanceof Error) {
      req.log.debug('API error: %s', err.message)
      req.log.trace('API error: stack %s', err.stack ?? 'no stack trace')
      if (!(err instanceof HttpError || err instanceof multer.MulterError)) {
        req.log.error(`Unknown internal error ${err.name} ${err.message}`)
      }
    } else {
      req.log.error(err, 'API error (not instance of Error!)')
    }

    if (err instanceof ValidateError) {
      req.log.warn(err.fields, `Caught Validation Error for ${req.path}`)
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      err = new UploadError(`Zip file is too large. Must be less than ${env.get('UPLOAD_LIMIT_MB')}MB`)
    }

    if (err instanceof SessionError && err.code === 408) {
      res.redirect('/')
    }

    const code = err instanceof HttpError ? err.code : 500
    const toast = errorToast(err)

    // Track error in PostHog
    const postHog = container.resolve(PostHogService)
    const octokitToken = req.signedCookies[octokitTokenCookie]
    const posthogId = req.signedCookies[posthogIdCookie]

    if (posthogId) {
      postHog.trackError(octokitToken, posthogId, {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        code: code,
        path: req.path,
        method: req.method,
      })
    }

    res.setHeader('HX-Reswap', 'innerHTML')
    // really ugly workaround for https://github.com/bigskysoftware/htmx/issues/2518
    res.setHeader('HX-Reselect', ':not(* > *)')
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('HX-Trigger-After-Settle', JSON.stringify({ dtdlVisualisationError: { dialogId: toast.dialogId } }))
    res.status(code).send(toast.response)

    next()
  })

  return app
}
