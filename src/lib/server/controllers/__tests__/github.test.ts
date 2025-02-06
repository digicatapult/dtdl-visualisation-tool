import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { container } from 'tsyringe'

import { Env } from '../../env.js'
import { OAuthToken } from '../../models/github.js'
import { GithubRequest } from '../../utils/githubRequest.js'
import { GithubController } from '../github.js'
import { mockDb, mockSession, openOntologyMock, sessionUpdateStub, toHTMLString } from './helpers.js'
import {
  validSessionId as noOctokitSessionId,
  validSessionOctokitId,
  validSessionReturnUrlId,
} from './sessionFixtures.js'

chai.use(chaiAsPromised)
const { expect } = chai

const env = container.resolve(Env)

const mockOwner = 'owner'
const mockRepo = 'repo'
const mockFullName = `${mockOwner}/${mockRepo}`
const mockBranch = 'branch'

const repos = {
  data: [
    {
      name: mockRepo,
      full_name: mockFullName,
      owner: {
        login: mockOwner,
      },
    },
  ],
}

const branches = {
  data: [
    {
      name: mockBranch,
    },
  ],
}

const contents = {
  data: [
    {
      name: 'someFile',
      path: 'path',
      type: 'file',
    },
    {
      name: 'someDirectory',
      path: 'path',
      type: 'dir',
    },
  ],
}

export const mockGithubRequest = {
  getRepos: () => Promise.resolve(repos),
  getBranches: () => Promise.resolve(branches),
  getContents: () => Promise.resolve(contents),
} as unknown as GithubRequest

describe.only('GithubController', async () => {
  const controller = new GithubController(mockDb, openOntologyMock, mockSession, mockGithubRequest)

  afterEach(() => {
    sinon.restore()
  })

  describe('/picker', () => {
    it('should return picker if octokit token present', async () => {
      const result = await controller.picker(validSessionOctokitId)
      if (!result) {
        throw new Error('Expected HTML response')
      }
      const html = await toHTMLString(result)

      expect(html).to.equal(`root_${validSessionOctokitId}_/github/repos?page=1_root`)
    })

    it('should redirect if octokit token NOT present', async () => {
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const setStatusSpy = sinon.spy(controller, 'setStatus')

      await controller.picker(noOctokitSessionId)
      expect(
        setHeaderSpy.calledWith(
          'Location',
          `https://github.com/login/oauth/authorize?client_id=${env.get('GH_CLIENT_ID')}&redirect_uri=http://${env.get('REDIRECT_HOST')}/github/callback?sessionId=${noOctokitSessionId}`
        )
      ).to.equal(true)
      expect(setStatusSpy.calledWith(302)).to.equal(true)
    })
  })

  describe('/callback', () => {
    it('should redirect to return url from session', async () => {
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const setStatusSpy = sinon.spy(controller, 'setStatus')
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
      await controller.callback('', validSessionReturnUrlId)

      const sessionUpdate = sessionUpdateStub.lastCall.args[1]

      expect(sessionUpdate).to.deep.equal({ octokitToken: token })
      expect(setHeaderSpy.calledWith('Location', `return.url`)).to.equal(true)
      expect(setStatusSpy.calledWith(302)).to.equal(true)
    })
  })

  describe('/repos', () => {
    it('should return repo full names in list', async () => {
      const page = 1
      const nextPageLink = `/github/repos?page=${page + 1}`
      const backLink = undefined
      const onClickLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=1`
      const result = await controller.repos(page, validSessionOctokitId).then(toHTMLString)

      expect(result).to.equal(
        `githubListItems_${mockFullName}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`
      )
    })
  })

  describe('/branches', () => {
    it('should return branch names in list', async () => {
      const page = 1
      const nextPageLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=${page + 1}`
      const backLink = `/github/repos?page=1`
      const result = await controller.branches(mockOwner, mockRepo, page, validSessionOctokitId).then(toHTMLString)

      expect(result).to.equal(
        `githubListItems_${branches.data.map(({ name }) => name)}_${nextPageLink}_${backLink}_githubListItems`
      )
    })
  })

  describe('/contents', () => {
    it('should return branch contents in list', async () => {
      const owner = 'owner'
      const repo = 'repo'
      const path = 'path'
      const ref = 'ref'
      const page = 1
      const nextPageLink = `/github/branches?owner=${owner}&repo=${repo}&page=${page + 1}`
      const backLink = `/github/repos?page=1`
      const result = await controller.contents(owner, repo, path, ref, validSessionOctokitId).then(toHTMLString)

      expect(result).to.equal(
        `githubListItems_${contents.data.map(({ name }) => name)}_${nextPageLink}_${backLink}_githubListItems`
      )
    })
  })
})
