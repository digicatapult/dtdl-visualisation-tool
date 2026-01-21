import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'

import { ModelDb } from '../../../db/modelDb.js'
import { DataError, GithubReqError } from '../../errors.js'
import { octokitTokenCookie } from '../../models/cookieNames.js'
import { GithubRequest } from '../../utils/githubRequest.js'
import OntologyViewTemplates from '../../views/templates/ontologyView.js'
import { PublishController } from '../publish.js'
import { getStub, mockReqWithCookie, toHTMLString } from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

const mockOntologyId = 'ontologyId'
const mockOwner = 'owner'
const mockRepo = 'repo'
const mockBaseBranch = 'main'
const mockBranchName = 'feat/new-branch'
const mockCommitMessage = 'Commit message'
const mockPrTitle = 'pr title'
const mockDescription = 'Description of changes'
const mockToken = 'token'
const mockTreeSha = 'treeSha'
const mockCommitSha = 'commitSha'
const mockPrUrl = 'http://github.com/pr'
const mockModel = {
  owner: mockOwner,
  repo: mockRepo,
  base_branch: mockBaseBranch,
  commit_hash: mockCommitSha,
}

const cookie = { [octokitTokenCookie]: mockToken }

const mockFiles = [{ path: 'file1.json', source: '{}' }]

describe('PublishController', () => {
  let mockModelDb: ModelDb
  let mockGithubRequest: GithubRequest
  let mockTemplates: OntologyViewTemplates
  let controller: PublishController

  beforeEach(() => {
    mockModelDb = {
      getDtdlFiles: sinon.stub(),
      getGithubModelById: sinon.stub(),
      updateModel: sinon.stub(),
    } as unknown as ModelDb

    mockGithubRequest = {
      getBranch: sinon.stub(),
      createBranch: sinon.stub(),
      createBlob: sinon.stub(),
      createTree: sinon.stub(),
      createCommit: sinon.stub(),
      createPullRequest: sinon.stub(),
      updateBranch: sinon.stub(),
      getCommit: sinon.stub(),
    } as unknown as GithubRequest

    mockTemplates = {
      publishDialog: sinon.stub().returns('publishDialog_html'),
      githubLink: sinon.stub().returns('githubLink_html'),
    } as unknown as OntologyViewTemplates

    controller = new PublishController(mockModelDb, mockGithubRequest, mockTemplates)
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('/dialog', () => {
    it('should return publish dialog', async () => {
      getStub(mockModelDb, 'getGithubModelById').resolves(mockModel)
      getStub(mockGithubRequest, 'getCommit').resolves({ sha: mockCommitSha })
      getStub(mockModelDb, 'updateModel').resolves(mockModel)

      const result = await controller.dialog(mockReqWithCookie({}), mockOntologyId)
      const html = await toHTMLString(result)
      expect(html).to.equal('publishDialog_html')
    })
  })

  describe('/publish', () => {
    it('should throw error if missing GitHub token', async () => {
      const req = mockReqWithCookie({})
      await expect(
        controller.publish(
          req,
          mockOntologyId,
          mockCommitMessage,
          mockPrTitle,
          mockDescription,
          'newBranch',
          mockBranchName
        )
      ).to.be.rejectedWith(GithubReqError, 'Missing GitHub token')
    })

    it('should throw error if publishing to current branch and out of sync', async () => {
      getStub(mockModelDb, 'getGithubModelById').resolves(mockModel)
      getStub(mockGithubRequest, 'getCommit').resolves({ sha: mockCommitSha })
      getStub(mockModelDb, 'updateModel').resolves({ ...mockModel, is_out_of_sync: true })

      await expect(
        controller.publish(
          mockReqWithCookie(cookie),
          mockOntologyId,
          mockCommitMessage,
          mockPrTitle,
          mockDescription,
          'currentBranch',
          mockBranchName
        )
      ).to.be.rejectedWith(DataError, `ontology is out-of-sync`)
    })

    it('should throw error if base branch not found', async () => {
      getStub(mockModelDb, 'getGithubModelById').resolves(mockModel)
      getStub(mockGithubRequest, 'getCommit').resolves({ sha: mockCommitSha })
      getStub(mockModelDb, 'updateModel').resolves(mockModel)
      getStub(mockModelDb, 'getDtdlFiles').resolves(mockFiles)
      getStub(mockGithubRequest, 'getBranch').resolves(null)

      await expect(
        controller.publish(
          mockReqWithCookie(cookie),
          mockOntologyId,
          mockCommitMessage,
          mockPrTitle,
          mockDescription,
          'newBranch',
          mockBranchName
        )
      ).to.be.rejectedWith(DataError, `Base branch ${mockBaseBranch} not found`)
    })

    it('should throw error if branch already exists', async () => {
      const getBranchStub = getStub(mockGithubRequest, 'getBranch')

      getStub(mockModelDb, 'getGithubModelById').resolves(mockModel)
      getStub(mockGithubRequest, 'getCommit').resolves({ sha: mockCommitSha })
      getStub(mockModelDb, 'updateModel').resolves(mockModel)
      getStub(mockModelDb, 'getDtdlFiles').resolves(mockFiles)
      getBranchStub
        .onFirstCall()
        .resolves({ object: { sha: 'baseSha' } })
        .onSecondCall()
        .resolves({ object: { sha: 'existingSha' } })

      await expect(
        controller.publish(
          mockReqWithCookie(cookie),
          mockOntologyId,
          mockCommitMessage,
          mockPrTitle,
          mockDescription,
          'newBranch',
          mockBranchName
        )
      ).to.be.rejectedWith(DataError, `Branch with name ${mockBranchName} already exists`)
    })

    it('should publish to new branch successfully', async () => {
      const getBranchStub = getStub(mockGithubRequest, 'getBranch')
      const createBlobStub = getStub(mockGithubRequest, 'createBlob')
      const createTreeStub = getStub(mockGithubRequest, 'createTree')
      const createCommitStub = getStub(mockGithubRequest, 'createCommit')
      const createBranchStub = getStub(mockGithubRequest, 'createBranch')
      const createPullRequestStub = getStub(mockGithubRequest, 'createPullRequest')

      getStub(mockModelDb, 'getGithubModelById').resolves(mockModel)
      getStub(mockGithubRequest, 'getCommit').resolves({ sha: mockCommitSha })
      getStub(mockModelDb, 'updateModel').resolves(mockModel)
      getStub(mockModelDb, 'getDtdlFiles').resolves(mockFiles)
      getBranchStub
        .onFirstCall()
        .resolves({ object: { sha: 'baseSha' } })
        .onSecondCall()
        .resolves(null) // new branch does not exist
      createBlobStub.resolves({ sha: 'blobSha' })
      createTreeStub.resolves({ sha: mockTreeSha })
      createCommitStub.resolves({ sha: mockCommitSha })
      createBranchStub.resolves()
      createPullRequestStub.resolves({ html_url: mockPrUrl })

      const result = await controller.publish(
        mockReqWithCookie(cookie),
        mockOntologyId,
        mockCommitMessage,
        mockPrTitle,
        mockDescription,
        'newBranch',
        mockBranchName
      )

      const html = await toHTMLString(result)
      expect(html).to.contain('Published successfully')
      expect(html).to.contain(mockPrUrl)

      expect(createBranchStub.firstCall.args).to.deep.equal([
        mockToken,
        mockOwner,
        mockRepo,
        mockBranchName,
        mockCommitSha,
      ])

      expect(createBlobStub.callCount).to.equal(mockFiles.length)
      expect(createTreeStub.callCount).to.equal(1)
      expect(createCommitStub.callCount).to.equal(1)

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

    it('should publish to current branch successfully', async () => {
      const updateBranchStub = getStub(mockGithubRequest, 'updateBranch')

      getStub(mockModelDb, 'getGithubModelById').resolves(mockModel)
      getStub(mockGithubRequest, 'getCommit').resolves({ sha: mockCommitSha })
      getStub(mockModelDb, 'updateModel')
        .onFirstCall()
        .resolves(mockModel)
        .onSecondCall()
        .resolves()
        .onThirdCall()
        .resolves({
          owner: mockOwner,
          repo: mockRepo,
          base_branch: mockBaseBranch,
        })
      getStub(mockModelDb, 'getDtdlFiles').resolves(mockFiles)
      getStub(mockGithubRequest, 'getBranch').resolves({ object: { sha: 'baseSha' } })
      getStub(mockGithubRequest, 'createBlob').resolves({ sha: 'blobSha' })
      getStub(mockGithubRequest, 'createTree').resolves({ sha: mockTreeSha })
      getStub(mockGithubRequest, 'createCommit').resolves({ sha: mockCommitSha })

      const result = await controller.publish(
        mockReqWithCookie(cookie),
        mockOntologyId,
        mockCommitMessage,
        mockPrTitle,
        mockDescription,
        'currentBranch',
        mockBranchName
      )

      const html = await toHTMLString(result)
      expect(html).to.contain(`Published successfully`)
      expect(html).to.contain(`View branch`)

      expect(updateBranchStub.firstCall.args).to.deep.equal([
        mockToken,
        mockOwner,
        mockRepo,
        mockBaseBranch,
        mockCommitSha,
      ])
    })

    it('should revert commit hash if updating branch fails', async () => {
      const updateBranchStub = getStub(mockGithubRequest, 'updateBranch')
      const updateModelStub = getStub(mockModelDb, 'updateModel')

      getStub(mockModelDb, 'getGithubModelById').resolves(mockModel)
      getStub(mockGithubRequest, 'getCommit').resolves({ sha: mockCommitSha })
      updateModelStub.resolves(mockModel)
      getStub(mockModelDb, 'getDtdlFiles').resolves(mockFiles)
      getStub(mockGithubRequest, 'getBranch').resolves({ object: { sha: 'baseSha' } })
      getStub(mockGithubRequest, 'createBlob').resolves({ sha: 'blobSha' })
      getStub(mockGithubRequest, 'createTree').resolves({ sha: mockTreeSha })
      const newCommitSha = 'newCommitSha'
      getStub(mockGithubRequest, 'createCommit').resolves({ sha: newCommitSha })

      const error = new Error('Update branch failed')
      updateBranchStub.rejects(error)

      await expect(
        controller.publish(
          mockReqWithCookie(cookie),
          mockOntologyId,
          mockCommitMessage,
          mockPrTitle,
          mockDescription,
          'currentBranch',
          mockBranchName
        )
      ).to.be.rejectedWith(error)

      expect(updateModelStub.secondCall.args).to.deep.equal([
        mockOntologyId,
        { is_out_of_sync: false, commit_hash: newCommitSha },
      ])

      expect(updateModelStub.thirdCall.args).to.deep.equal([mockOntologyId, { commit_hash: mockCommitSha }])
    })
  })
})
