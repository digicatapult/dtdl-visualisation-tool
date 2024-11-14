import { IocContainer } from '@tsoa/runtime'
import { container } from 'tsyringe'

import { logger, Logger, type ILogger } from './logger.js'
import { Cache, cache, type ICache } from './utils/cache.js'

container.register<ILogger>(Logger, {
  useValue: logger,
})

container.register<ICache>(Cache, {
  useValue: cache,
})

export const iocContainer: IocContainer = {
  get: <T>(controller: { prototype: T }): T => {
    return container.resolve<T>(controller as never)
  },
}
