import { pino } from 'pino'
import { container } from 'tsyringe'

import { Env } from './env/index.js'

const env = container.resolve(Env)

export const logger = pino(
  {
    name: 'htmx-tsoa',
    timestamp: true,
    level: env.get('LOG_LEVEL'),
  },
  process.stdout
)

export const Logger = Symbol('Logger')
export type ILogger = typeof logger

export async function withTimerAsync<T>(label: string, logger: ILogger, fn: () => Promise<T>): Promise<T> {
  const start = process.hrtime.bigint()
  const result = await fn()
  const duration = Number(process.hrtime.bigint() - start) / 1_000_000
  logger.info(`${label} took ${duration.toFixed(2)}ms`)
  return result
}

export function withTimer<T>(label: string, logger: ILogger, fn: () => T): T {
  const start = process.hrtime.bigint()
  const result = fn()
  const duration = Number(process.hrtime.bigint() - start) / 1_000_000
  logger.info(`${label} took ${duration.toFixed(2)}ms`)
  return result
}
