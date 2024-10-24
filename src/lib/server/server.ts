import bodyParser from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express, { Express } from 'express'
import requestLogger from 'pino-http'
import { logger } from './logger.js'
import { RegisterRoutes } from './routes.js'

export default async (): Promise<Express> => {
  const app: Express = express()

  app.use(
    requestLogger({
      logger,
    })
  )

  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(cors())
  app.use(compression())

  RegisterRoutes(app)

  app.use('/public', express.static('public'))
  app.use('/lib/htmx.org', express.static('node_modules/htmx.org/dist'))
  app.use('/lib/htmx-ext-json-enc/json-enc.js', express.static('node_modules/htmx-ext-json-enc/json-enc.js'))
  app.use('/lib/mermaid', express.static('node_modules/mermaid/dist'))
  app.use('/lib/mermaid-elk', express.static('node_modules/@mermaid-js/layout-elk/dist'))
  app.use('/lib/svg-pan-zoom', express.static('node_modules/svg-pan-zoom/dist'))

  return app
}
