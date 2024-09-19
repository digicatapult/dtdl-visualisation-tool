import bodyParser from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express, { Express } from 'express'
import requestLogger from 'pino-http'
import { RegisterRoutes } from './routes.js'

import { logger } from './logger.js'

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
  app.use('/lib/mermaid', express.static('node_modules/mermaid/dist'))
  app.use('/lib', express.static('build/src/lib/server/utils/mermaid'))

  return app
}
