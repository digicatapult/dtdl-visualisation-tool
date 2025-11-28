import { describe, test } from 'mocha'

import { expect } from 'chai'
import Sinon from 'sinon'
import { container } from 'tsyringe'
import { mockLogger } from '../../controllers/__tests__/helpers.js'
import { Env } from '../../env/index.js'
import { GithubReqError } from '../../errors.js'
import { ICache } from '../cache.js'
import { GithubRequest } from '../githubRequest.js'

const env = container.resolve(Env)

describe('githubRequest', function () {
  test('getZip errors with upload limit', async function () {
    const mockCache = {
      get: Sinon.stub(),
      set: Sinon.stub(),
      has: Sinon.stub(),
      clear: Sinon.stub(),
      size: Sinon.stub(),
    } as unknown as ICache
    const githubRequest = new GithubRequest(mockLogger, mockCache)
    Sinon.stub(githubRequest, 'requestWrapper').resolves({
      headers: {
        'content-length': env.get('UPLOAD_LIMIT_MB') * 1024 * 1024 + 1,
      },
    })
    await expect(githubRequest.getZip('token', '', '', '')).to.be.rejectedWith(GithubReqError)
  })
})
