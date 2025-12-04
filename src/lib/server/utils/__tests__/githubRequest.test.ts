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
  test('getZip errors with upload limit', async function () {
    const githubRequest = new GithubRequest(mockLogger)
    Sinon.stub(githubRequest, 'requestWrapper').resolves({
      headers: {
        'content-length': env.get('UPLOAD_LIMIT_MB') * 1024 * 1024 + 1,
      },
    })
    await expect(githubRequest.getZip('token', '', '', '')).to.be.rejectedWith(GithubReqError)
  })

  test('getInstallationRepos filters repos without push permissions', async function () {
    const githubRequest = new GithubRequest(mockLogger)
    const repos = [
      { name: 'repo1', permissions: { push: true } },
      { name: 'repo2', permissions: { push: false } },
      { name: 'repo3' },
    ]

    Sinon.stub(githubRequest, 'requestWrapper').resolves({
      data: {
        repositories: repos,
      },
    })

    const result = await githubRequest.getInstallationRepos('token', 123, 1)
    expect(result).to.deep.equal([repos[0]])
  })

  test('getRepoPermissions returns edit when user and app has correct write permissions', async function () {
    const githubRequest = new GithubRequest(mockLogger)
    const stub = Sinon.stub(githubRequest, 'requestWrapper')

    stub.onCall(0).resolves({
      data: {
        permissions: { pull: true },
      },
    })
    stub.onCall(1).resolves({
      data: {
        permissions: { contents: 'write', pull_requests: 'write' },
      },
    })

    const result = await githubRequest.getRepoPermissions('token', 'owner', 'repo')
    expect(result).to.equal('edit')
  })

  test('getRepoPermissions returns view when app lacks permissions but user has pull access', async function () {
    const githubRequest = new GithubRequest(mockLogger)
    const stub = Sinon.stub(githubRequest, 'requestWrapper')

    stub.onCall(0).resolves({
      data: {
        permissions: { pull: true },
      },
    })
    stub.onCall(1).resolves(null)

    const result = await githubRequest.getRepoPermissions('token', 'owner', 'repo')
    expect(result).to.equal('view')
  })

  test(`getRepoPermissions returns unauthorised when user can't pull repo`, async function () {
    const githubRequest = new GithubRequest(mockLogger)
    const stub = Sinon.stub(githubRequest, 'requestWrapper')

    stub.onCall(0).resolves({
      data: {
        permissions: { pull: false },
      },
    })

    const result = await githubRequest.getRepoPermissions('token', 'owner', 'repo')
    expect(result).to.equal('unauthorised')
  })

  test(`getRepoPermissions returns unauthorised when user can't access repo`, async function () {
    const githubRequest = new GithubRequest(mockLogger)
    const stub = Sinon.stub(githubRequest, 'requestWrapper')

    stub.onCall(0).resolves(null)

    const result = await githubRequest.getRepoPermissions('token', 'owner', 'repo')
    expect(result).to.equal('unauthorised')
  })
})
