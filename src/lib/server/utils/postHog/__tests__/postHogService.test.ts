import { expect } from 'chai'
import type { Request } from 'express'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import { PostHog } from 'posthog-node'
import sinon from 'sinon'
import { Env } from '../../../env/index.js'
import { type ILogger } from '../../../logger.js'
import { GithubRequest } from '../../../utils/githubRequest.js'
import { PostHogService } from '../postHogService.js'

describe('PostHogService', () => {
  let mockEnv: sinon.SinonStubbedInstance<Env>
  let mockLogger: ILogger
  let mockGithubRequest: sinon.SinonStubbedInstance<GithubRequest>
  let postHogCaptureStub: sinon.SinonStub
  let postHogIdentifyStub: sinon.SinonStub
  let postHogAliasStub: sinon.SinonStub

  beforeEach(() => {
    mockEnv = sinon.createStubInstance(Env)
    mockLogger = pino({ level: 'silent' })
    mockGithubRequest = sinon.createStubInstance(GithubRequest)

    // Manually stub getAuthenticatedUser since it's an async method
    mockGithubRequest.getAuthenticatedUser = sinon.stub()

    // Stub PostHog methods
    postHogCaptureStub = sinon.stub(PostHog.prototype, 'capture')
    postHogIdentifyStub = sinon.stub(PostHog.prototype, 'identify')
    postHogAliasStub = sinon.stub(PostHog.prototype, 'alias')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('initialization', () => {
    it('should initialize when PostHog is enabled with valid config', () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      expect(service['enabled']).to.equal(true)
      expect(service['postHogClient']).to.not.equal(null)
    })

    it('should not initialize when PostHog is disabled', () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(false)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      expect(service['enabled']).to.equal(false)
      expect(service['postHogClient']).to.equal(null)
    })

    it('should disable PostHog when enabled but key is missing', () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns(undefined)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      expect(service['enabled']).to.equal(false)
      expect(service['postHogClient']).to.equal(null)
    })

    it('should disable PostHog when enabled but host is missing', () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns(undefined)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      expect(service['enabled']).to.equal(false)
      expect(service['postHogClient']).to.equal(null)
    })
  })

  describe('captureEvent', () => {
    it('should capture event when enabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.captureEvent('distinct-id-123', 'test_event', { property: 'value' })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'distinct-id-123',
          event: 'test_event',
          properties: { property: 'value' },
        })
      ).to.equal(true)
    })

    it('should not capture event when disabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(false)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.captureEvent('distinct-id-123', 'test_event', { property: 'value' })

      expect(postHogCaptureStub.called).to.equal(false)
    })

    it('should handle errors gracefully', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      postHogCaptureStub.throws(new Error('PostHog error'))

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      // Should not throw
      await service.captureEvent('distinct-id-123', 'test_event', { property: 'value' })
    })
  })

  describe('trackUploadOntology', () => {
    it('should track upload ontology event with correct properties', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackUploadOntology(undefined, 'anonymous-id-123', {
        ontologyId: 'ontology-123',
        source: 'zip',
        fileCount: 5,
        fileName: 'test.zip',
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'anonymous-id-123',
          event: 'uploadOntology',
          properties: {
            ontologyId: 'ontology-123',
            source: 'zip',
            fileCount: 5,
            fileName: 'test.zip',
          },
        })
      ).to.equal(true)
    })
  })

  describe('trackUpdateOntologyView', () => {
    it('should track update ontology view event with correct properties', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackUpdateOntologyView(undefined, 'anonymous-id-123', {
        ontologyId: 'ontology-123',
        diagramType: 'flowchart',
        hasSearch: true,
        expandedCount: 3,
        highlightNodeId: 'node-456',
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'anonymous-id-123',
          event: 'updateOntologyView',
          properties: {
            ontologyId: 'ontology-123',
            diagramType: 'flowchart',
            hasSearch: true,
            expandedCount: 3,
            highlightNodeId: 'node-456',
          },
        })
      ).to.equal(true)
    })

    it('should track update ontology view event with searchTerm', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackUpdateOntologyView(undefined, 'anonymous-id-123', {
        ontologyId: 'ontology-123',
        diagramType: 'classDiagram',
        hasSearch: true,
        searchTerm: 'PowerSystem',
        expandedCount: 5,
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'anonymous-id-123',
          event: 'updateOntologyView',
          properties: {
            ontologyId: 'ontology-123',
            diagramType: 'classDiagram',
            hasSearch: true,
            searchTerm: 'PowerSystem',
            expandedCount: 5,
          },
        })
      ).to.equal(true)
    })
  })

  describe('trackError', () => {
    it('should track error event with correct properties', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackError(undefined, 'anonymous-id-123', {
        message: 'Something went wrong',
        code: 500,
        path: '/api/test',
        method: 'POST',
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'anonymous-id-123',
          event: 'error',
          properties: {
            message: 'Something went wrong',
            code: 500,
            path: '/api/test',
            method: 'POST',
          },
        })
      ).to.equal(true)
    })

    it('should track error event with stack trace', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackError(undefined, 'anonymous-id-123', {
        message: 'Test error',
        stack: 'Error: Test error\n    at Object.<anonymous>',
        code: 400,
        path: '/open',
        method: 'GET',
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      const captureCall = postHogCaptureStub.getCall(0).args[0]
      expect(captureCall.event).to.equal('error')
      expect(captureCall.properties.stack).to.contain('Test error')
    })

    it('should not track error when disabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(false)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackError(undefined, 'anonymous-id-123', {
        message: 'Error',
        code: 500,
        path: '/test',
        method: 'GET',
      })

      expect(postHogCaptureStub.called).to.equal(false)
    })
  })

  describe('trackNodeSelected', () => {
    it('should track node selected event with correct properties', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackNodeSelected(undefined, 'anonymous-id-123', {
        ontologyId: 'ontology-123',
        entityId: 'entity-456',
        entityKind: 'Interface',
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'anonymous-id-123',
          event: 'nodeSelected',
          properties: {
            ontologyId: 'ontology-123',
            entityId: 'entity-456',
            entityKind: 'Interface',
          },
        })
      ).to.equal(true)
    })
  })

  describe('trackModeToggle', () => {
    it('should track mode toggle event with correct properties', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackModeToggle(undefined, 'anonymous-id-123', {
        ontologyId: 'ontology-456',
        editMode: true,
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'anonymous-id-123',
          event: 'modeToggle',
          properties: {
            ontologyId: 'ontology-456',
            editMode: true,
          },
        })
      ).to.equal(true)
    })

    it('should track switching to view mode', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')
      mockGithubRequest.getAuthenticatedUser.resolves({
        id: 123,
        login: 'testuser',
        email: 'test@test.com',
        name: 'Test User',
      })

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackModeToggle('test-token', 'anonymous-id-456', {
        ontologyId: 'ontology-789',
        editMode: false,
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'github:testuser',
          event: 'modeToggle',
          properties: {
            ontologyId: 'ontology-789',
            editMode: false,
          },
        })
      ).to.equal(true)
    })
  })

  describe('identify', () => {
    it('should identify user when enabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.identify('user-123', { email: 'test@example.com' })

      expect(postHogIdentifyStub.calledOnce).to.equal(true)
      expect(
        postHogIdentifyStub.calledWith({
          distinctId: 'user-123',
          properties: { email: 'test@example.com' },
        })
      ).to.equal(true)
    })

    it('should not identify user when disabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(false)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.identify('user-123', { email: 'test@example.com' })

      expect(postHogIdentifyStub.called).to.equal(false)
    })

    it('should swallow errors gracefully', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      postHogIdentifyStub.throws(new Error('PostHog API error'))

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await expect(service.identify('user-123')).to.not.be.rejected
    })
  })

  describe('alias', () => {
    it('should alias user when enabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.alias('user-123', 'user-alias-456')

      expect(postHogAliasStub.calledOnce).to.equal(true)
      expect(
        postHogAliasStub.calledWith({
          distinctId: 'user-123',
          alias: 'user-alias-456',
        })
      ).to.equal(true)
    })

    it('should not alias user when disabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(false)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.alias('user-123', 'user-alias-456')

      expect(postHogAliasStub.called).to.equal(false)
    })

    it('should swallow errors gracefully', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      postHogAliasStub.throws(new Error('PostHog API error'))

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await expect(service.alias('user-123', 'user-alias-456')).to.not.be.rejected
    })
  })

  describe('identifyFromRequest', () => {
    it('should identify from GitHub token when present', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const mockUser = {
        login: 'testuser',
        id: 12345,
        email: 'test@example.com',
        name: 'Test User',
      }
      mockGithubRequest.getAuthenticatedUser.resolves(mockUser)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      const mockReq = {
        signedCookies: {
          OCTOKIT_TOKEN: 'test-token',
          POSTHOG_ID: 'session-123',
        },
      } as Request

      await service.identifyFromRequest(mockReq)

      expect(mockGithubRequest.getAuthenticatedUser.calledOnceWith('test-token')).to.equal(true)
      expect(postHogIdentifyStub.calledOnce).to.equal(true)
      expect(
        postHogIdentifyStub.calledWith({
          distinctId: 'github:testuser',
          properties: {
            github_id: 12345,
            github_login: 'testuser',
            github_email: 'test@example.com',
            github_name: 'Test User',
          },
        })
      ).to.equal(true)
      expect(postHogAliasStub.calledOnce).to.equal(true)
      expect(postHogAliasStub.calledWith({ distinctId: 'github:testuser', alias: 'session-123' })).to.equal(true)
    })

    it('should identify anonymous session when no GitHub token', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      const mockReq = {
        signedCookies: {
          POSTHOG_ID: 'session-456',
        },
      } as Request

      await service.identifyFromRequest(mockReq)

      expect(mockGithubRequest.getAuthenticatedUser.called).to.equal(false)
      expect(postHogIdentifyStub.calledOnce).to.equal(true)
      expect(
        postHogIdentifyStub.calledWith({
          distinctId: 'session-456',
          properties: {
            anonymous: true,
          },
        })
      ).to.equal(true)
    })

    it('should not identify when disabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(false)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      const mockReq = {
        signedCookies: {
          OCTOKIT_TOKEN: 'test-token',
          POSTHOG_ID: 'session-123',
        },
      } as Request

      await service.identifyFromRequest(mockReq)

      expect(mockGithubRequest.getAuthenticatedUser.called).to.equal(false)
      expect(postHogIdentifyStub.called).to.equal(false)
      expect(postHogAliasStub.called).to.equal(false)
    })
  })
})
