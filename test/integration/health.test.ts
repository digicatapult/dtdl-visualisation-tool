import { expect } from 'chai'
import { describe, it } from 'mocha'
import version from '../../src/version'

describe('health check', function () {
  it('returns 200 + version', async () => {
    const response = await fetch(`http://localhost:3000/api/health`)
    expect(response.status).to.equal(200)
    expect(await response.json()).to.deep.equal({ version })
  })
})
