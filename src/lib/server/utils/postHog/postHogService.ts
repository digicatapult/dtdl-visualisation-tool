import { PostHog } from 'posthog-node'
import { inject, singleton } from 'tsyringe'
import { Env } from '../../env/index.js'
import { Logger, type ILogger } from '../../logger.js'
import { GithubRequest } from '../githubRequest.js'

export type PostHogEventProperties = Record<string, string | number | boolean | null | undefined>

export interface UploadOntologyEvent extends PostHogEventProperties {
  ontologyId: string
  source: 'zip' | 'github' | 'local' | 'default'
  fileCount: number
  fileName?: string
}

export interface UpdateOntologyViewEvent extends PostHogEventProperties {
  ontologyId: string
  diagramType: 'flowchart' | 'classDiagram'
  hasSearch: boolean
  expandedCount: number
  highlightNodeId?: string
}

export interface NodeSelectedEvent extends PostHogEventProperties {
  ontologyId: string
  entityId: string
  entityKind: string
}

export interface ModeToggleEvent extends PostHogEventProperties {
  ontologyId: string
  editMode: boolean
}

@singleton()
export class PostHogService {
  private postHogClient: PostHog | null = null
  private enabled: boolean

  constructor(
    @inject(Logger) private logger: ILogger,
    @inject(Env) private env: Env,
    private githubRequest: GithubRequest
  ) {
    this.enabled = this.env.get('POSTHOG_ENABLED')
    this.logger = logger.child({ service: 'PostHogService' })

    if (this.enabled) {
      const key = this.env.get('NEXT_PUBLIC_POSTHOG_KEY')
      const host = this.env.get('NEXT_PUBLIC_POSTHOG_HOST')

      if (!key || !host) {
        this.logger.warn('PostHog is enabled but NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST is not set')
        this.enabled = false
        return
      }

      this.postHogClient = new PostHog(key, { host })
      this.logger.info('PostHogService initialized')
    } else {
      this.logger.debug('PostHog tracking is disabled')
    }
  }

  /**
   * Get distinct ID for tracking (GitHub user or persistent anonymous ID)
   * @param octokitToken - Optional GitHub OAuth token
   * @param anonymousId - Persistent anonymous ID from POSTHOG_ID cookie
   * @returns distinctId as 'github:username' or anonymousId
   */
  async getDistinctId(octokitToken: string | undefined, anonymousId: string): Promise<string> {
    if (!octokitToken) {
      return anonymousId
    }

    try {
      const user = await this.githubRequest.getAuthenticatedUser(octokitToken)
      return `github:${user.login}`
    } catch (error) {
      this.logger.debug({ error }, 'Failed to get GitHub user for tracking, using anonymous ID')
      return anonymousId
    }
  }

  /**
   * Identify user from GitHub token
   * This fetches user info from GitHub and identifies them in PostHog
   * @param octokitToken - GitHub OAuth token
   * @param anonymousId - Persistent anonymous ID from POSTHOG_ID cookie to alias
   */
  async identifyFromGitHubToken(octokitToken: string, anonymousId: string): Promise<void> {
    if (!this.enabled || !this.postHogClient) {
      return
    }

    try {
      const user = await this.githubRequest.getAuthenticatedUser(octokitToken)

      // Use GitHub login as distinct ID, alias with anonymous ID
      await this.identify(`github:${user.login}`, {
        github_id: user.id,
        github_login: user.login,
        github_email: user.email,
        github_name: user.name,
      })

      // Alias anonymous ID to GitHub user
      await this.alias(`github:${user.login}`, anonymousId)

      this.logger.debug({ user: user.login, anonymousId }, 'Identified user from GitHub token')
    } catch (error) {
      this.logger.warn({ error }, 'Failed to identify user from GitHub token')
    }
  }

  /**
   * Identify anonymous user with persistent anonymous ID
   * @param anonymousId - Persistent anonymous ID from POSTHOG_ID cookie
   */
  async identifySession(anonymousId: string): Promise<void> {
    if (!this.enabled || !this.postHogClient) {
      return
    }

    try {
      await this.identify(anonymousId, {
        anonymous: true,
      })
      this.logger.debug({ anonymousId }, 'Identified anonymous session')
    } catch (error) {
      this.logger.warn({ error }, 'Failed to identify session')
    }
  }

  /**
   * Capture a generic event with properties
   * Non-blocking, swallows errors
   */
  async captureEvent(distinctId: string, event: string, properties?: PostHogEventProperties): Promise<void> {
    if (!this.enabled || !this.postHogClient) {
      return
    }

    try {
      this.postHogClient.capture({
        distinctId,
        event,
        properties,
      })
      this.logger.debug({ distinctId, properties }, `Captured event: ${event}`)
    } catch (error) {
      this.logger.warn({ error }, `Failed to capture PostHog event: ${event}`)
    }
  }

  /**
   * Track ontology upload event
   * @param distinctId - User/session identifier (sessionId or github:username)
   * @param event - Event properties including ontologyId
   */
  async trackUploadOntology(distinctId: string, event: UploadOntologyEvent): Promise<void> {
    return this.captureEvent(distinctId, 'uploadOntology', event)
  }

  /**
   * Track ontology view update event
   * @param distinctId - User/session identifier (sessionId or github:username)
   * @param event - Event properties including ontologyId
   */
  async trackUpdateOntologyView(distinctId: string, event: UpdateOntologyViewEvent): Promise<void> {
    return this.captureEvent(distinctId, 'updateOntologyView', event)
  }

  /**
   * Track node selection event
   * @param distinctId - User/session identifier (sessionId or github:username)
   * @param event - Event properties including ontologyId
   */
  async trackNodeSelected(distinctId: string, event: NodeSelectedEvent): Promise<void> {
    return this.captureEvent(distinctId, 'nodeSelected', event)
  }

  /**
   * Track mode toggle event (view/edit)
   * @param distinctId - User/session identifier (sessionId or github:username)
   * @param event - Event properties including ontologyId and editMode
   */
  async trackModeToggle(distinctId: string, event: ModeToggleEvent): Promise<void> {
    return this.captureEvent(distinctId, 'modeToggle', event)
  }

  /**
   * Identify a user with properties
   */
  async identify(distinctId: string, properties?: PostHogEventProperties): Promise<void> {
    if (!this.enabled || !this.postHogClient) {
      return
    }

    try {
      this.postHogClient.identify({
        distinctId,
        properties,
      })
      this.logger.debug({ properties }, `Identified user: ${distinctId}`)
    } catch (error) {
      this.logger.warn({ error }, `Failed to identify user in PostHog: ${distinctId}`)
    }
  }

  /**
   * Alias a user ID to another ID
   */
  async alias(distinctId: string, alias: string): Promise<void> {
    if (!this.enabled || !this.postHogClient) {
      return
    }

    try {
      this.postHogClient.alias({
        distinctId,
        alias,
      })
      this.logger.debug(`Aliased user: ${distinctId} -> ${alias}`)
    } catch (error) {
      this.logger.warn({ error }, `Failed to alias user in PostHog: ${distinctId}`)
    }
  }

  /**
   * Shutdown the PostHog client gracefully
   */
  async shutdown(): Promise<void> {
    if (this.postHogClient) {
      await this.postHogClient.shutdown()
      this.logger.info('PostHogService shutdown complete')
    }
  }
}
