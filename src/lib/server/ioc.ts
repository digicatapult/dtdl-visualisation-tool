import { IocContainer } from '@tsoa/runtime'
import { container } from 'tsyringe'

import { LastSearchToken } from './controllers/root.js'
import { logger, Logger, type ILogger } from './logger.js'

container.register<ILogger>(Logger, {
  useValue: logger,
})

container.register(LastSearchToken, { useValue: '' })

export const iocContainer: IocContainer = {
  get: <T>(controller: { prototype: T }): T => {
    return container.resolve<T>(controller as never)
  },
}
