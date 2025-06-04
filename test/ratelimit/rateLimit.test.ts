import { expect } from 'chai'
import { Express } from 'express'
import { afterEach, beforeEach, describe } from 'mocha'
import request from 'supertest'
import { container } from 'tsyringe'

import { Env } from '../../src/lib/server/env'
import createHttpServer from '../../src/lib/server/server.js'
import { mockAllowLocalIp, MockDispatcherContext, withDispatcherMock } from './helpers/mock.js'

const env = container.resolve(Env)

describe('rate limit', () => {
  let app: Express
  const context: MockDispatcherContext = {} as MockDispatcherContext

  withDispatcherMock(context)

  beforeEach(async function () {
    app = await createHttpServer()
  })

  afterEach(async function () {
    container.clearInstances()
  })

  it('should return 429 after global limit', async () => {
    for (let i = 0; i < env.get('GLOBAL_RATE_LIMIT'); i++) {
      const response = await request(app).get('/api/health')
      expect(response.status).to.equal(200)
    }

    const response = await request(app).get('/api/health')
    expect(response.status).to.equal(429)
  })

  it('should return 429 after strict limit', async () => {
    for (let i = 0; i < env.get('STRICT_RATE_LIMIT'); i++) {
      const response = await request(app).post('/open')
      expect(response.status).to.equal(500)
    }

    const response = await request(app).post('/open')
    expect(response.status).to.equal(429)
  })

  it('should allow unlimited requests for configured IPs', async () => {
    mockAllowLocalIp()
    app = await createHttpServer()

    for (let i = 0; i < env.get('GLOBAL_RATE_LIMIT'); i++) {
      const response = await request(app).get('/api/health')
      expect(response.status).to.equal(200)
    }

    const response = await request(app).get('/api/health')
    expect(response.status).to.equal(200)
  })
})
