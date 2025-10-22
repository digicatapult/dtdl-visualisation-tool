import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import express from 'express'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import { InternalError, UnauthorisedError } from '../../errors.js'
import { modelHistoryCookie, octokitTokenCookie } from '../../models/cookieNames.js'
import { ViewAndEditPermission } from '../../models/github.js'
import { GithubRequest } from '../../utils/githubRequest.js'
import { checkEditPermission, recentFilesFromCookies } from '../helpers.js'
import { githubDtdlId, mockLogger, previewDtdlId, simpleDtdlId, simpleMockModelDb } from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

// Mock cookie data
const validTimestamp = new Date()
validTimestamp.setHours(14, 0, 0, 0)
const invalidModelId = 'invalid-id'

describe('recentFilesFromCookies', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('should handle missing cookie gracefully', async () => {
    const cookies = {}
    const result = await recentFilesFromCookies(simpleMockModelDb, cookies, mockLogger)
    expect(result).to.deep.equal([])
  })

  it('should return recent files for valid cookie history', async () => {
    const cookies = {
      [modelHistoryCookie]: [{ id: previewDtdlId, timestamp: validTimestamp.getTime() }],
    }

    const result = await recentFilesFromCookies(simpleMockModelDb, cookies, mockLogger)

    expect(result).to.deep.equal([
      {
        fileName: 'Preview Model',
        lastVisited: 'Today at 14:00',
        preview: 'Preview',
        dtdlModelId: previewDtdlId,
      },
    ])
  })

  it('should filter out invalid models from cookie history', async () => {
    const cookies = {
      [modelHistoryCookie]: [
        { id: previewDtdlId, timestamp: validTimestamp.getTime() },
        { id: invalidModelId, timestamp: validTimestamp.getTime() },
      ],
    }

    const result = await recentFilesFromCookies(simpleMockModelDb, cookies, mockLogger)

    expect(result).to.deep.equal([
      {
        fileName: 'Preview Model',
        lastVisited: 'Today at 14:00',
        preview: 'Preview',
        dtdlModelId: previewDtdlId,
      },
    ])
  })

  it('should sort recent files by timestamp in descending order', async () => {
    const baseTimestamp = new Date()
    baseTimestamp.setHours(14, 0, 0, 0)

    const simpleModelTimestamp = baseTimestamp.getTime()

    const previewModelTimestamp = new Date(baseTimestamp)
    previewModelTimestamp.setHours(15, 0, 0, 0)

    const cookies = {
      [modelHistoryCookie]: [
        { id: previewDtdlId, timestamp: previewModelTimestamp.getTime() },
        { id: simpleDtdlId, timestamp: simpleModelTimestamp },
      ],
    }

    const result = await recentFilesFromCookies(simpleMockModelDb, cookies, mockLogger)

    expect(result.map((r) => r.fileName)).to.deep.equal(['Preview Model', 'Simple Model'])
  })
})

describe('checkEditPermission', () => {
  let mockRequest: express.Request
  let getModelByIdStub: SinonStub
  let getRepoPermissionsStub: SinonStub
  let mockGithubRequest: GithubRequest

  beforeEach(() => {
    mockRequest = {
      signedCookies: {},
    } as express.Request

    getModelByIdStub = sinon.stub()
    getRepoPermissionsStub = sinon.stub()

    mockGithubRequest = {
      getRepoPermissions: getRepoPermissionsStub,
    } as unknown as GithubRequest
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('successful cases', () => {
    it('should pass when user has edit permissions', async () => {
      const testToken = 'valid-github-token'
      const testOwner = 'test-owner'
      const testRepo = 'test-repo'

      mockRequest.signedCookies[octokitTokenCookie] = testToken
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: testOwner,
        repo: testRepo,
      })
      getRepoPermissionsStub.resolves('edit' as ViewAndEditPermission)

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      // Should not throw
      await checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest)

      sinon.assert.calledOnceWithExactly(getModelByIdStub, githubDtdlId)
      sinon.assert.calledOnceWithExactly(getRepoPermissionsStub, testToken, testOwner, testRepo)
    })
  })

  describe('error cases', () => {
    it('should throw InternalError when model has no owner', async () => {
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: null,
        repo: 'test-repo',
      })

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest))
        .to.be.rejectedWith(InternalError)
        .and.eventually.have.property('message', 'owner or repo not found in database for GitHub source')

      sinon.assert.notCalled(getRepoPermissionsStub)
    })

    it('should throw InternalError when model has no repo', async () => {
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: 'test-owner',
        repo: null,
      })

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest))
        .to.be.rejectedWith(InternalError)
        .and.eventually.have.property('message', 'owner or repo not found in database for GitHub source')

      sinon.assert.notCalled(getRepoPermissionsStub)
    })

    it('should throw InternalError when model has undefined owner', async () => {
      getModelByIdStub.resolves({
        id: githubDtdlId,
        repo: 'test-repo',
        // owner is undefined
      })

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest))
        .to.be.rejectedWith(InternalError)
        .and.eventually.have.property('message', 'owner or repo not found in database for GitHub source')
    })

    it('should throw InternalError when model has undefined repo', async () => {
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: 'test-owner',
        // repo is undefined
      })

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest))
        .to.be.rejectedWith(InternalError)
        .and.eventually.have.property('message', 'owner or repo not found in database for GitHub source')
    })

    it('should throw InternalError when model has empty string owner', async () => {
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: '',
        repo: 'test-repo',
      })

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest))
        .to.be.rejectedWith(InternalError)
        .and.eventually.have.property('message', 'owner or repo not found in database for GitHub source')
    })

    it('should throw InternalError when model has empty string repo', async () => {
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: 'test-owner',
        repo: '',
      })

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest))
        .to.be.rejectedWith(InternalError)
        .and.eventually.have.property('message', 'owner or repo not found in database for GitHub source')
    })

    it('should throw UnauthorisedError when user has view permissions only', async () => {
      const testToken = 'valid-github-token'
      const testOwner = 'test-owner'
      const testRepo = 'test-repo'

      mockRequest.signedCookies[octokitTokenCookie] = testToken
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: testOwner,
        repo: testRepo,
      })
      getRepoPermissionsStub.resolves('view' as ViewAndEditPermission)

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest))
        .to.be.rejectedWith(UnauthorisedError)
        .and.eventually.have.property('message', 'User is unauthorised to make this request')

      sinon.assert.calledOnceWithExactly(getRepoPermissionsStub, testToken, testOwner, testRepo)
    })

    it('should throw UnauthorisedError when user has no permissions', async () => {
      const testToken = 'valid-github-token'
      const testOwner = 'test-owner'
      const testRepo = 'test-repo'

      mockRequest.signedCookies[octokitTokenCookie] = testToken
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: testOwner,
        repo: testRepo,
      })
      getRepoPermissionsStub.resolves('unauthorised' as ViewAndEditPermission)

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest))
        .to.be.rejectedWith(UnauthorisedError)
        .and.eventually.have.property('message', 'User is unauthorised to make this request')
    })

    it('should propagate errors from getModelById', async () => {
      const testError = new Error('Database connection failed')
      getModelByIdStub.rejects(testError)

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest)).to.be.rejectedWith(
        testError
      )

      sinon.assert.notCalled(getRepoPermissionsStub)
    })

    it('should propagate errors from getRepoPermissions', async () => {
      const testToken = 'valid-github-token'
      const testOwner = 'test-owner'
      const testRepo = 'test-repo'
      const testError = new Error('GitHub API failed')

      mockRequest.signedCookies[octokitTokenCookie] = testToken
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: testOwner,
        repo: testRepo,
      })
      getRepoPermissionsStub.rejects(testError)

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest)).to.be.rejectedWith(
        testError
      )
    })
  })

  describe('token handling', () => {
    it('should pass undefined token to getRepoPermissions when no cookie is present', async () => {
      const testOwner = 'test-owner'
      const testRepo = 'test-repo'

      // No token in signed cookies
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: testOwner,
        repo: testRepo,
      })
      getRepoPermissionsStub.resolves('unauthorised' as ViewAndEditPermission)

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest)).to.be.rejectedWith(
        UnauthorisedError
      )

      sinon.assert.calledOnceWithExactly(getRepoPermissionsStub, undefined, testOwner, testRepo)
    })

    it('should pass empty string token to getRepoPermissions', async () => {
      const testOwner = 'test-owner'
      const testRepo = 'test-repo'

      mockRequest.signedCookies[octokitTokenCookie] = ''
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: testOwner,
        repo: testRepo,
      })
      getRepoPermissionsStub.resolves('unauthorised' as ViewAndEditPermission)

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest)).to.be.rejectedWith(
        UnauthorisedError
      )

      sinon.assert.calledOnceWithExactly(getRepoPermissionsStub, '', testOwner, testRepo)
    })

    it('should pass null token to getRepoPermissions', async () => {
      const testOwner = 'test-owner'
      const testRepo = 'test-repo'

      mockRequest.signedCookies[octokitTokenCookie] = null
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: testOwner,
        repo: testRepo,
      })
      getRepoPermissionsStub.resolves('unauthorised' as ViewAndEditPermission)

      const mockModelDb = {
        ...simpleMockModelDb,
        getModelById: getModelByIdStub,
      } as unknown as typeof simpleMockModelDb

      await expect(checkEditPermission(mockRequest, githubDtdlId, mockModelDb, mockGithubRequest)).to.be.rejectedWith(
        UnauthorisedError
      )

      sinon.assert.calledOnceWithExactly(getRepoPermissionsStub, null, testOwner, testRepo)
    })
  })
})
