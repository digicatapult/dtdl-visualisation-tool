import { IocContainer } from '@tsoa/runtime'
import { container } from 'tsyringe'

import { Env } from './env/index.js'
import { logger, Logger, type ILogger } from './logger.js'
import { pool, Pool, type IPool } from './pool.js'
import { Cache, type ICache } from './utils/cache.js'
import { LRUCache } from './utils/lruCache.js'

const env = container.resolve(Env)

container.register<ILogger>(Logger, {
  useValue: logger,
})

container.register<ICache>(Cache, {
  useValue: new LRUCache(env.get('CACHE_SIZE'), env.get('CACHE_TTL')),
})

container.register<IPool>(Pool, { useValue: pool })

export const iocContainer: IocContainer = {
  get: <T>(controller) => {
    return container.resolve<T>(controller as never)
  },
}
