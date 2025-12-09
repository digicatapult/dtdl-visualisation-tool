import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'

import { ModelDb } from '../../../db/modelDb.js'
import { DataError, GithubReqError } from '../../errors.js'
import { octokitTokenCookie } from '../../models/cookieNames.js'
import { GithubRequest } from '../../utils/githubRequest.js'
import MermaidTemplates from '../../views/components/mermaid.js'
import { PublishController } from '../publish.js'
import { mockReqWithCookie, toHTMLString } from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

const mockOntologyId = 'ontologyId'
const mockOwner = 'owner'
const mockRepo = 'repo'
const mockBaseBranch = 'main'
const mockBranchName = 'feat/new-branch'
const mockPrTitle = 'pr title'
const mockDescription = 'Description of changes'
const mockToken = 'token'
const mockSha = 'sha'
const mockTreeSha = 'treeSha'
const mockCommitSha = 'commitSha'
const mockPrUrl = 'http://github.com/pr'

const cookie = { [octokitTokenCookie]: mockToken }

const mockFiles = [{ path: 'file1.json', source: '{}' }]

const getModelByIdStub = sinon.stub()
const getDtdlFilesStub = sinon.stub()

const mockModelDb = {
  getModelById: getModelByIdStub,
  getDtdlFiles: getDtdlFilesStub,
} as unknown as ModelDb

const getBranchStub = sinon.stub()
const createBranchStub = sinon.stub()
const createBlobStub = sinon.stub()
const createTreeStub = sinon.stub()
const createCommitStub = sinon.stub()
const updateRefStub = sinon.stub()
const createPullRequestStub = sinon.stub()

const mockGithubRequest = {
  getBranch: getBranchStub,
  createBranch: createBranchStub,
  createBlob: createBlobStub,
  createTree: createTreeStub,
  createCommit: createCommitStub,
  updateRef: updateRefStub,
  createPullRequest: createPullRequestStub,
} as unknown as GithubRequest

const publishDialogStub = sinon.stub().returns('publishDialog_html')

const mockTemplates = {
  publishDialog: publishDialogStub,
} as unknown as MermaidTemplates

const controller = new PublishController(mockModelDb, mockGithubRequest, mockTemplates)

describe('PublishController', () => {
  beforeEach(() => {
    sinon.restore()
    getBranchStub.reset()
    createBranchStub.reset()
    createBlobStub.reset()
    createTreeStub.reset()
    createCommitStub.reset()
    updateRefStub.reset()
    createPullRequestStub.reset()
    getModelByIdStub.reset()
    getDtdlFilesStub.reset()
  })

  describe('/dialog', () => {
    it('should return publish dialog', async () => {
      const result = await controller.dialog(mockOntologyId)
      const html = await toHTMLString(result)
      expect(html).to.equal('publishDialog_html')
    })
  })

  describe('/publish', () => {
    it('should throw error if missing GitHub token', async () => {
      const req = mockReqWithCookie({})
      await expect(
        controller.publish(req, mockOntologyId, mockPrTitle, mockDescription, mockBranchName)
      ).to.be.rejectedWith(GithubReqError, 'Missing GitHub token')
    })

    it('should throw error if ontology is missing GitHub metadata', async () => {
      const req = mockReqWithCookie(cookie)

      getModelByIdStub.resolves({
        owner: null,
        repo: null,
        base_branch: null,
      })

      await expect(
        controller.publish(req, mockOntologyId, mockPrTitle, mockDescription, mockBranchName)
      ).to.be.rejectedWith(DataError, 'Ontology is not from GitHub or missing base branch information')
    })

    it('should throw error if base branch not found', async () => {
      const req = mockReqWithCookie(cookie)
      getModelByIdStub.resolves({
        owner: mockOwner,
        repo: mockRepo,
        base_branch: mockBaseBranch,
      })
      getDtdlFilesStub.resolves(mockFiles)
      getBranchStub.resolves(null)

      await expect(
        controller.publish(req, mockOntologyId, mockPrTitle, mockDescription, mockBranchName)
      ).to.be.rejectedWith(DataError, `Base branch ${mockBaseBranch} not found`)
    })

    it('should throw error if branch already exists', async () => {
      const req = mockReqWithCookie(cookie)
      getModelByIdStub.resolves({
        owner: mockOwner,
        repo: mockRepo,
        base_branch: mockBaseBranch,
      })
      getDtdlFilesStub.resolves(mockFiles)
      getBranchStub
        .onFirstCall()
        .resolves({ object: { sha: mockSha } })
        .onSecondCall()
        .resolves({ object: { sha: 'existingSha' } })

      await expect(
        controller.publish(req, mockOntologyId, mockPrTitle, mockDescription, mockBranchName)
      ).to.be.rejectedWith(DataError, `Branch with name ${mockBranchName} already exists`)
    })

    it('should publish successfully', async () => {
      const req = mockReqWithCookie(cookie)
      getModelByIdStub.resolves({
        owner: mockOwner,
        repo: mockRepo,
        base_branch: mockBaseBranch,
      })
      getDtdlFilesStub.resolves(mockFiles)
      getBranchStub
        .onFirstCall()
        .resolves({ object: { sha: mockSha } }) // base branch
        .onSecondCall()
        .resolves(null) // new branch does not exist
      createBlobStub.resolves({ sha: 'blobSha' })
      createTreeStub.resolves({ sha: mockTreeSha })
      createCommitStub.resolves({ sha: mockCommitSha })
      createBranchStub.resolves()
      updateRefStub.resolves()
      createPullRequestStub.resolves({ html_url: mockPrUrl })

      const result = await controller.publish(req, mockOntologyId, mockPrTitle, mockDescription, mockBranchName)

      const html = await toHTMLString(result)
      expect(html).to.contain('Published successfully')
      expect(html).to.contain(mockPrUrl)

      expect(createBranchStub.firstCall.args).to.deep.equal([mockToken, mockOwner, mockRepo, mockBranchName, mockSha])

      expect(createBlobStub.callCount).to.equal(mockFiles.length)
      expect(createTreeStub.callCount).to.equal(1)
      expect(createCommitStub.callCount).to.equal(1)
      expect(updateRefStub.callCount).to.equal(1)

      expect(createPullRequestStub.firstCall.args).to.deep.equal([
        mockToken,
        mockOwner,
        mockRepo,
        mockPrTitle,
        mockBranchName,
        mockBaseBranch,
        mockDescription,
      ])
    })
  })
})
