import { Express } from 'express'
import 'reflect-metadata'
import { logger } from './logger.js'
import server from './server.js'

export const httpServer = async (port: number): Promise<Express> => {
  const app: Express = await server()
  app.listen(port, () => {
    logger.info(`[server]: Server is running at http://localhost:${port}`)
  })
  return app
}
