import bodyParser from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express, { Express } from 'express'
import multer from 'multer'
import requestLogger from 'pino-http'
import { ValidateError } from 'tsoa'
import { HttpError } from './errors.js'
import { logger } from './logger.js'
import { RegisterRoutes } from './routes.js'

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
      fileSize: 10 * 1024 * 1024,
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
    } else {
      req.log.debug('API error: %s', err?.toString())
    }

    if (err instanceof HttpError) {
      res.status(err.code).send({
        message: err.message,
      })
      return
    }

    if (err instanceof multer.MulterError) {
      req.log.warn(`Multer error for ${req.path}:`, err.message)
      req.log.trace('API error: stack %j', err.stack)
      res.status(400).send('Upload error')
      return
    }

    if (err instanceof ValidateError) {
      req.log.warn(`Caught Validation Error for ${req.path}:`, err.fields)
      res.status(422).json({
        message: 'Validation Failed',
        details: err?.fields,
      })
      return
    }
    if (err instanceof Error) {
      console.log(err)
      res.status(500).json({
        message: 'Internal Server Error',
      })
      return
    }

    next()
  })

  return app
}
