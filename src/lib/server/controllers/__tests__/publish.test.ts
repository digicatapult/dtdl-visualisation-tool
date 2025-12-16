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

const getDtdlFilesStub = sinon.stub()
const getGithubModelByIdStub = sinon.stub()
const updateModelStub = sinon.stub()

const mockModelDb = {
  getDtdlFiles: getDtdlFilesStub,
  getGithubModelById: getGithubModelByIdStub,
  updateModel: updateModelStub,
} as unknown as ModelDb

const getBranchStub = sinon.stub()
const createBranchStub = sinon.stub()
const createBlobStub = sinon.stub()
const createTreeStub = sinon.stub()
const createCommitStub = sinon.stub()
const createPullRequestStub = sinon.stub()
const updateBranchStub = sinon.stub()
const getCommitStub = sinon.stub()

const mockGithubRequest = {
  getBranch: getBranchStub,
  createBranch: createBranchStub,
  createBlob: createBlobStub,
  createTree: createTreeStub,
  createCommit: createCommitStub,
  createPullRequest: createPullRequestStub,
  updateBranch: updateBranchStub,
  getCommit: getCommitStub,
} as unknown as GithubRequest

const publishDialogStub = sinon.stub().returns('publishDialog_html')
const githubLinkStub = sinon.stub().returns('githubLink_html')

const mockTemplates = {
  publishDialog: publishDialogStub,
  githubLink: githubLinkStub,
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
    createPullRequestStub.reset()
    updateBranchStub.reset()
    getGithubModelByIdStub.reset()
    getDtdlFilesStub.reset()
  })

  describe('/dialog', () => {
    it('should return publish dialog', async () => {
      getGithubModelByIdStub.resolves(mockModel)
      getCommitStub.resolves({ sha: mockCommitSha })
      updateModelStub.resolves(mockModel)
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
      const req = mockReqWithCookie(cookie)
      getGithubModelByIdStub.resolves(mockModel)
      getCommitStub.resolves({ sha: mockCommitSha })
      updateModelStub.resolves({ ...mockModel, is_out_of_sync: true })

      await expect(
        controller.publish(
          req,
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
      const req = mockReqWithCookie(cookie)
      getGithubModelByIdStub.resolves(mockModel)
      getCommitStub.resolves({ sha: mockCommitSha })
      getDtdlFilesStub.resolves(mockFiles)
      getBranchStub.resolves(null)

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
      ).to.be.rejectedWith(DataError, `Base branch ${mockBaseBranch} not found`)
    })

    it('should throw error if branch already exists', async () => {
      const req = mockReqWithCookie(cookie)
      getGithubModelByIdStub.resolves(mockModel)
      getCommitStub.resolves({ sha: mockCommitSha })
      getDtdlFilesStub.resolves(mockFiles)
      getBranchStub
        .onFirstCall()
        .resolves({ object: { sha: 'baseSha' } })
        .onSecondCall()
        .resolves({ object: { sha: 'existingSha' } })

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
      ).to.be.rejectedWith(DataError, `Branch with name ${mockBranchName} already exists`)
    })

    it('should publish to new branch successfully', async () => {
      const req = mockReqWithCookie(cookie)
      getGithubModelByIdStub.resolves(mockModel)
      getCommitStub.resolves({ sha: mockCommitSha })
      getDtdlFilesStub.resolves(mockFiles)
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
        req,
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
      const req = mockReqWithCookie(cookie)
      getGithubModelByIdStub.resolves(mockModel)
      getCommitStub.resolves({ sha: mockCommitSha })
      updateModelStub.resolves(mockModel)
      getDtdlFilesStub.resolves(mockFiles)
      updateModelStub.resolves()
      getBranchStub.resolves({ object: { sha: 'baseSha' } })
      createBlobStub.resolves({ sha: 'blobSha' })
      createTreeStub.resolves({ sha: mockTreeSha })
      createCommitStub.resolves({ sha: mockCommitSha })
      updateModelStub.resolves({
        owner: mockOwner,
        repo: mockRepo,
        base_branch: mockBaseBranch,
      })

      const result = await controller.publish(
        req,
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
      updateModelStub.reset()
      const req = mockReqWithCookie(cookie)
      getGithubModelByIdStub.resolves(mockModel)
      getCommitStub.resolves({ sha: mockCommitSha })
      updateModelStub.resolves(mockModel)
      getDtdlFilesStub.resolves(mockFiles)
      getBranchStub.resolves({ object: { sha: 'baseSha' } })
      createBlobStub.resolves({ sha: 'blobSha' })
      createTreeStub.resolves({ sha: mockTreeSha })
      const newCommitSha = 'newCommitSha'
      createCommitStub.resolves({ sha: newCommitSha })

      const error = new Error('Update branch failed')
      updateBranchStub.rejects(error)

      await expect(
        controller.publish(
          req,
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
