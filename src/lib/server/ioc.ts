import { IocContainer } from '@tsoa/runtime'
import { LRUCache } from 'lru-cache'
import { container } from 'tsyringe'

import { logger, Logger, type ILogger } from './logger.js'

const cache = new LRUCache<string, string>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
})

container.register<ILogger>(Logger, {
  useValue: logger,
})

container.register<typeof cache>(LRUCache, {
  useValue: cache,
})

export const iocContainer: IocContainer = {
  get: <T>(controller: { prototype: T }): T => {
    return container.resolve<T>(controller as never)
  },
}
