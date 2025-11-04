import { describe, test } from 'mocha'

import { expect } from 'chai'
import Sinon from 'sinon'
import { container } from 'tsyringe'
import { mockLogger } from '../../controllers/__tests__/helpers.js'
import { Env } from '../../env/index.js'
import { GithubReqError } from '../../errors.js'
import { GithubRequest } from '../githubRequest.js'

const env = container.resolve(Env)

describe('githubRequest', function () {
  test('getRepos', async function () {
    const githubRequest = new GithubRequest(mockLogger)
    Sinon.stub(githubRequest, 'requestWrapper').resolves({ data: 'repos' })
    const repos = await githubRequest.getRepos('token', 1)
    expect(repos).to.equal('repos')
  })

  test('getBla', async function () {
    const githubRequest = new GithubRequest(mockLogger)
    Sinon.stub(githubRequest, 'requestWrapper').resolves({ data: 'repos' })
    const repos = await githubRequest.getBla('token', 1)
    expect(repos).to.equal('repos')
  })

  test('getZip errors with upload limit', async function () {
    const githubRequest = new GithubRequest(mockLogger)
    Sinon.stub(githubRequest, 'requestWrapper').resolves({
      headers: {
        'content-length': env.get('UPLOAD_LIMIT_MB') * 1024 * 1024 + 1,
      },
    })
    await expect(githubRequest.getZip('token', '', '', '')).to.be.rejectedWith(GithubReqError)
  })
})
