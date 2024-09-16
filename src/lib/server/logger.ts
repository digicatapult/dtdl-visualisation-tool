import { pino } from 'pino'
import { container } from 'tsyringe'

import { Env } from './env.js'

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
