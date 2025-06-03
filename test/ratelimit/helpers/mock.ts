import { cleanEnv } from 'envalid'
import { container } from 'tsyringe'
import { Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici'
import { Env, envConfig } from '../../../src/lib/server/env'
import { strArrayValidator } from '../../../src/lib/server/env/validators'
import { RateLimiter } from '../../../src/lib/server/utils/rateLimit'

export type MockDispatcherContext = { original: Dispatcher; mock: MockAgent }

export const withDispatcherMock = (context: MockDispatcherContext) => {
  beforeEach(function () {
    context.original = getGlobalDispatcher()
    context.mock = new MockAgent()
    setGlobalDispatcher(context.mock)
  })

  afterEach(function () {
    setGlobalDispatcher(context.original)
  })
}

export const mockAllowLocalIp = () => {
  const testEnv = cleanEnv(process.env, {
    ...envConfig,
    IP_ALLOW_LIST: strArrayValidator({ default: ['::ffff:127.0.0.1'] }),
  })

  class MockEnv {
    get(key: string) {
      return testEnv[key]
    }
  }

  container.registerInstance<Env>(Env, new MockEnv() as Env)
  container.registerInstance<RateLimiter>(RateLimiter, new RateLimiter(new MockEnv() as Env))
}
