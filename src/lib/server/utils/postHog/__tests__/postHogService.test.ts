import { expect } from 'chai'
import { describe, it } from 'mocha'
import { PostHog } from 'posthog-node'
import sinon from 'sinon'
import { Env } from '../../../env/index.js'
import { logger, type ILogger } from '../../../logger.js'
import { GithubRequest } from '../../../utils/githubRequest.js'
import { PostHogService } from '../postHogService.js'

describe('PostHogService', () => {
  let mockEnv: sinon.SinonStubbedInstance<Env>
  let mockLogger: ILogger
  let mockGithubRequest: sinon.SinonStubbedInstance<GithubRequest>
  let postHogCaptureStub: sinon.SinonStub
  let postHogIdentifyStub: sinon.SinonStub
  let postHogAliasStub: sinon.SinonStub
  let postHogShutdownStub: sinon.SinonStub

  beforeEach(() => {
    mockEnv = sinon.createStubInstance(Env)
    mockLogger = logger.child({ test: 'postHogService' })
    mockGithubRequest = sinon.createStubInstance(GithubRequest)

    // Manually stub getAuthenticatedUser since it's an async method
    mockGithubRequest.getAuthenticatedUser = sinon.stub()

    // Stub PostHog methods
    postHogCaptureStub = sinon.stub(PostHog.prototype, 'capture')
    postHogIdentifyStub = sinon.stub(PostHog.prototype, 'identify')
    postHogAliasStub = sinon.stub(PostHog.prototype, 'alias')
    postHogShutdownStub = sinon.stub(PostHog.prototype, 'shutdown')
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

      await service.trackUploadOntology('ontology-123', {
        ontologyId: 'ontology-123',
        source: 'zip',
        fileCount: 5,
        fileName: 'test.zip',
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'ontology-123',
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

      await service.trackUpdateOntologyView('ontology-123', {
        ontologyId: 'ontology-123',
        diagramType: 'flowchart',
        hasSearch: true,
        expandedCount: 3,
        highlightNodeId: 'node-456',
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'ontology-123',
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

      await service.trackNodeSelected('ontology-123', {
        ontologyId: 'ontology-123',
        entityId: 'entity-456',
        entityKind: 'Interface',
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'ontology-123',
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

      await service.trackModeToggle('session-123', {
        ontologyId: 'ontology-456',
        editMode: true,
      })

      expect(postHogCaptureStub.calledOnce).to.equal(true)
      expect(
        postHogCaptureStub.calledWith({
          distinctId: 'session-123',
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

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.trackModeToggle('github:testuser', {
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

  describe('shutdown', () => {
    it('should shutdown PostHog client when enabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.shutdown()

      expect(postHogShutdownStub.calledOnce).to.equal(true)
    })

    it('should not throw when shutting down disabled service', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(false)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await expect(service.shutdown()).to.not.be.rejected
      expect(postHogShutdownStub.called).to.equal(false)
    })
  })

  describe('identifyFromGitHubToken', () => {
    it('should identify GitHub user and alias session', async () => {
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

      await service.identifyFromGitHubToken('test-token', 'session-123')

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

    it('should not identify when disabled', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(false)

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.identifyFromGitHubToken('test-token', 'session-123')

      expect(mockGithubRequest.getAuthenticatedUser.called).to.equal(false)
      expect(postHogIdentifyStub.called).to.equal(false)
      expect(postHogAliasStub.called).to.equal(false)
    })

    it('should handle GitHub API errors gracefully', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      mockGithubRequest.getAuthenticatedUser.rejects(new Error('GitHub API error'))

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      // Should not throw
      await service.identifyFromGitHubToken('test-token', 'session-123')

      expect(postHogIdentifyStub.called).to.equal(false)
      expect(postHogAliasStub.called).to.equal(false)
    })
  })

  describe('identifySession', () => {
    it('should identify anonymous user with session ID', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      await service.identifySession('session-456')

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

      await service.identifySession('session-456')

      expect(postHogIdentifyStub.called).to.equal(false)
    })

    it('should handle errors gracefully', async () => {
      mockEnv.get.withArgs('POSTHOG_ENABLED').returns(true)
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
      mockEnv.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('https://test.posthog.com')

      postHogIdentifyStub.throws(new Error('PostHog error'))

      const service = new PostHogService(
        mockLogger,
        mockEnv as unknown as Env,
        mockGithubRequest as unknown as GithubRequest
      )

      // Should not throw
      await service.identifySession('session-456')
    })
  })
})
