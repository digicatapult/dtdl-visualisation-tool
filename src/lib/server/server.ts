import bodyParser from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express, { Express } from 'express'
import multer from 'multer'
import requestLogger from 'pino-http'
import { ValidateError } from 'tsoa'
import { container } from 'tsyringe'
import { Env } from './env.js'
import { HttpError, SessionError, UploadError } from './errors.js'
import { logger } from './logger.js'
import { RegisterRoutes } from './routes.js'
import { errorToast } from './views/components/errors.js'

const env = container.resolve(Env)

export default async (): Promise<Express> => {
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

  RegisterRoutes(app, { multer: multerOptions })

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

  app.use(function errorHandler(
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    if (err instanceof Error) {
      req.log.debug('API error: %s', err.message)
      req.log.trace('API error: stack %j', err.stack)
      if (!(err instanceof HttpError || err instanceof multer.MulterError)) {
        req.log.error(`Unknown internal error ${err.name} ${err.message}`)
      }
    } else {
      req.log.error('API error (not instance of Error!): %s', err?.toString())
    }

    if (err instanceof ValidateError) {
      req.log.warn(`Caught Validation Error for ${req.path}:`, err.fields)
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      err = new UploadError(`Zip file is too large. Must be less than ${env.get('UPLOAD_LIMIT_MB')}MB`)
    }

    if (err instanceof SessionError && err.code === 408) {
      res.redirect('/')
    }

    const code = err instanceof HttpError ? err.code : 500
    const toast = errorToast(err)

    res.setHeader('HX-Reswap', 'innerHTML')
    // really ugly workaround for https://github.com/bigskysoftware/htmx/issues/2518
    res.setHeader('HX-Reselect', ':not(* > *)')
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('HX-Trigger', JSON.stringify({ dtdlVisualisationError: { dialogId: toast.dialogId } }))
    res.status(code).send(toast.response)

    next()
  })

  return app
}
