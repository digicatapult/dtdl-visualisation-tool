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

  RegisterRoutes(app)

  return app
}
