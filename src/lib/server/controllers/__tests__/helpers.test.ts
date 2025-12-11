import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import express from 'express'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import { container } from 'tsyringe'
import { ModelDb } from '../../../db/modelDb.js'
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
  let mockResponse: express.Response
  let mockNext: SinonStub
  let statusStub: SinonStub
  let setHeaderStub: SinonStub
  let endStub: SinonStub
  let getModelByIdStub: SinonStub
  let getDtdlModelAndTreeStub: SinonStub
  let getRepoPermissionsStub: SinonStub
  let containerResolveStub: SinonStub

  beforeEach(() => {
    statusStub = sinon.stub().returnsThis()
    setHeaderStub = sinon.stub().returnsThis()
    endStub = sinon.stub()

    mockResponse = {
      status: statusStub,
      setHeader: setHeaderStub,
      end: endStub,
    } as unknown as express.Response

    mockNext = sinon.stub()

    mockRequest = {
      signedCookies: {},
      headers: {},
      originalUrl: '/test/path',
      params: { ontologyId: githubDtdlId },
    } as unknown as express.Request

    getModelByIdStub = sinon.stub()
    getDtdlModelAndTreeStub = sinon.stub()
    getRepoPermissionsStub = sinon.stub()

    // Mock the container.resolve calls
    containerResolveStub = sinon.stub(container, 'resolve')
    containerResolveStub.withArgs(ModelDb).returns({
      getModelById: getModelByIdStub,
      getDtdlModelAndTree: getDtdlModelAndTreeStub,
    })
    containerResolveStub.withArgs(GithubRequest).returns({
      getRepoPermissions: getRepoPermissionsStub,
    })
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
      getDtdlModelAndTreeStub.resolves({
        model: {},
        fileTree: [],
      })

      // Should not throw and should call next()
      await checkEditPermission(mockRequest, mockResponse, mockNext)

      sinon.assert.calledOnceWithExactly(getModelByIdStub, githubDtdlId)
      sinon.assert.calledOnceWithExactly(getRepoPermissionsStub, testToken, testOwner, testRepo)
      sinon.assert.calledOnce(mockNext)
    })
  })

  describe('error cases', () => {
    it('should throw InternalError when model has no owner', async () => {
      // Need a token to get past the initial check
      mockRequest.signedCookies[octokitTokenCookie] = 'test-token'

      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: null,
        repo: 'test-repo',
      })

      await expect(checkEditPermission(mockRequest, mockResponse, mockNext)).to.be.rejectedWith(
        InternalError,
        'owner or repo not found in database for GitHub source'
      )

      sinon.assert.notCalled(getRepoPermissionsStub)
      sinon.assert.notCalled(mockNext)
    })

    it('should throw InternalError when model has no repo', async () => {
      // Need a token to get past the initial check
      mockRequest.signedCookies[octokitTokenCookie] = 'test-token'

      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: 'test-owner',
        repo: null,
      })

      await expect(checkEditPermission(mockRequest, mockResponse, mockNext))
        .to.be.rejectedWith(InternalError)
        .and.eventually.have.property('message', 'owner or repo not found in database for GitHub source')

      sinon.assert.notCalled(getRepoPermissionsStub)
      sinon.assert.notCalled(mockNext)
    })

    it('should throw InternalError when model has undefined owner', async () => {
      // Need a token to get past the initial check
      mockRequest.signedCookies[octokitTokenCookie] = 'test-token'

      getModelByIdStub.resolves({
        id: githubDtdlId,
        repo: 'test-repo',
        // owner is undefined
      })

      await expect(checkEditPermission(mockRequest, mockResponse, mockNext))
        .to.be.rejectedWith(InternalError)
        .and.eventually.have.property('message', 'owner or repo not found in database for GitHub source')
    })

    it('should throw InternalError when model has undefined repo', async () => {
      // Need a token to get past the initial check
      mockRequest.signedCookies[octokitTokenCookie] = 'test-token'

      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: 'test-owner',
        // repo is undefined
      })

      await expect(checkEditPermission(mockRequest, mockResponse, mockNext))
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

      await expect(checkEditPermission(mockRequest, mockResponse, mockNext))
        .to.be.rejectedWith(UnauthorisedError)
        .and.eventually.have.property('message', 'User is unauthorised to make this request')

      sinon.assert.calledOnceWithExactly(getRepoPermissionsStub, testToken, testOwner, testRepo)
      sinon.assert.notCalled(mockNext)
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

      await expect(checkEditPermission(mockRequest, mockResponse, mockNext))
        .to.be.rejectedWith(UnauthorisedError)
        .and.eventually.have.property('message', 'User is unauthorised to make this request')
    })

    it('should propagate errors from getModelById', async () => {
      // Need a token to get past the initial check
      mockRequest.signedCookies[octokitTokenCookie] = 'test-token'

      const testError = new Error('Database connection failed')
      getModelByIdStub.rejects(testError)

      await expect(checkEditPermission(mockRequest, mockResponse, mockNext)).to.be.rejectedWith(testError)

      sinon.assert.notCalled(getRepoPermissionsStub)
      sinon.assert.notCalled(mockNext)
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

      await expect(checkEditPermission(mockRequest, mockResponse, mockNext)).to.be.rejectedWith(testError)

      sinon.assert.notCalled(mockNext)
    })
  })

  describe('token handling', () => {
    it('should set redirect headers when no cookie is present', async () => {
      const testOwner = 'test-owner'
      const testRepo = 'test-repo'

      // No token in signed cookies
      getModelByIdStub.resolves({
        id: githubDtdlId,
        owner: testOwner,
        repo: testRepo,
      })

      // The function should return early after setting redirect headers
      await checkEditPermission(mockRequest, mockResponse, mockNext)

      // Check that redirect headers were set
      sinon.assert.calledOnceWithExactly(statusStub, 302)
      sinon.assert.calledWith(setHeaderStub, 'Location')
      sinon.assert.calledOnce(endStub)

      // getRepoPermissions should NOT be called since we return early
      sinon.assert.notCalled(getRepoPermissionsStub)
      sinon.assert.notCalled(mockNext)
    })
  })
})
