import { expect } from 'chai'

describe('Homepage Integration Test', function () {
  it('should load the homepage', async () => {
    const response = await fetch(`http://localhost:3000/`)
    expect(response.status).to.equal(200)
  })
})
