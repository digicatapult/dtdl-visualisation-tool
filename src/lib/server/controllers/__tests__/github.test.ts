import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { container } from 'tsyringe'

import { Env } from '../../env.js'
import { OAuthToken } from '../../models/github.js'
import { GithubController } from '../github.js'
import { mockDb, mockSession, sessionUpdateStub, templateMock, toHTMLString } from './helpers.js'
import { validSessionId } from './sessionFixtures.js'

chai.use(chaiAsPromised)
const { expect } = chai

const env = container.resolve(Env)

const perPage = env.get('GH_PER_PAGE')

describe('GithubController', async () => {
  const controller = new GithubController(mockDb, templateMock, mockSession)

  afterEach(() => {
    sinon.restore()
  })

  describe('/', () => {
    it('should handle callback', async () => {
      const token = 'token'
      const mockToken: OAuthToken = {
        access_token: token,
        expires_in: 1,
        refresh_token: '',
        refresh_token_expires_in: 1,
        token_type: '',
        scope: '',
      }

      sinon.stub(controller, 'fetchAccessToken').resolves(mockToken)
      const result = await controller.callback('githubCode', validSessionId).then(toHTMLString)

      const sessionUpdate = sessionUpdateStub.lastCall.args[1]
      expect(sessionUpdate).to.deep.equal({ octokitToken: token })

      expect(result).to.equal(
        [`root_dagre-d3_undefined_root`, `githubModal_/github/repos?per_page=${perPage}&page=1_githubModal`].join('')
      )
    })
  })
})
