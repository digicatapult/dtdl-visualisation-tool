import { Express } from 'express'
import 'reflect-metadata'
import { logger } from './logger.js'
import server from './server.js'

export type ServerSettings = {
  port: number
}

export const httpServer = async (options: ServerSettings): Promise<Express> => {
  const app: Express = await server()

  app.listen(options.port, () => {
    logger.info(`[server]: Server is running at http://localhost:${options.port}`)
  })

  return app
}
