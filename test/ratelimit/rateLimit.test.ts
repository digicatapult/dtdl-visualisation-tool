import { expect } from 'chai'
import { container } from 'tsyringe'
import { Env } from '../../src/lib/server/env'

const env = container.resolve(Env)

describe.only('Test global rate limit', function () {
  this.timeout(100000)
  it('should return 429 after limit', async () => {
    for (let i = 0; i < env.get('GLOBAL_RATE_LIMIT'); i++) {
      await fetch('http://localhost:3000/api/health', {
        headers: {
          'x-test-rate-limit': 'true',
        },
      })
    }
    const response = await fetch('http://localhost:3000/api/health', {
      headers: {
        'x-test-rate-limit': 'true',
      },
    })
    expect(response.status).to.equal(429)
  })
})
