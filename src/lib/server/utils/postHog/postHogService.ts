import express from 'express'
import { randomUUID } from 'node:crypto'
import { PostHog } from 'posthog-node'
import { inject, singleton } from 'tsyringe'
import { Env } from '../../env/index.js'
import { Logger, type ILogger } from '../../logger.js'
import { octokitTokenCookie, posthogIdCookie } from '../../models/cookieNames.js'
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
  searchTerm?: string
  expandedCount: number
  highlightNodeId?: string
}

export interface ErrorEvent extends PostHogEventProperties {
  message: string
  stack?: string
  code?: number | string
  path?: string
  method?: string
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

const POSTHOG_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000 // 1 year
const POSTHOG_COOKIE_OPTIONS: express.CookieOptions = {
  sameSite: true,
  maxAge: POSTHOG_COOKIE_MAX_AGE_MS,
  httpOnly: true,
  signed: true,
  secure: process.env.NODE_ENV === 'production',
}

export const ensurePostHogId = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  if (req.signedCookies[posthogIdCookie]) {
    next()
    return
  }

  const anonymousId = randomUUID()
  res.cookie(posthogIdCookie, anonymousId, POSTHOG_COOKIE_OPTIONS)
  req.signedCookies[posthogIdCookie] = anonymousId
  next()
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
      this.logger.debug('PostHogService initialized')
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
   * Identify user from request cookies
   * Automatically determines whether to identify from GitHub token or anonymous session
   * @param req - Express request object containing signed cookies
   */
  async identifyFromRequest(req: express.Request): Promise<void> {
    if (!this.enabled || !this.postHogClient) {
      return
    }

    const octokitToken = req.signedCookies[octokitTokenCookie] as string | undefined
    const posthogId = req.signedCookies[posthogIdCookie] as string

    if (octokitToken) {
      await this.identifyFromGitHubToken(octokitToken, posthogId)
    } else {
      await this.identifySession(posthogId)
    }
  }

  /**
   * Identify user from GitHub token
   * This fetches user info from GitHub and identifies them in PostHog
   * @param octokitToken - GitHub OAuth token
   * @param anonymousId - Persistent anonymous ID from POSTHOG_ID cookie to alias
   */
  private async identifyFromGitHubToken(octokitToken: string, anonymousId: string): Promise<void> {
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
  private async identifySession(anonymousId: string): Promise<void> {
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
   * @param distinctId - User identifier (anonymousId or github:username)
   * @param event - Event name
   * @param properties - Optional event properties
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
   * @param octokitToken - Optional GitHub OAuth token from cookies
   * @param posthogId - Persistent anonymous ID from POSTHOG_ID cookie
   * @param event - Event properties including ontologyId, source, fileCount, and fileName
   */
  async trackUploadOntology(
    octokitToken: string | undefined,
    posthogId: string,
    event: UploadOntologyEvent
  ): Promise<void> {
    const distinctId = await this.getDistinctId(octokitToken, posthogId)
    return this.captureEvent(distinctId, 'uploadOntology', event)
  }

  /**
   * Track ontology view update event
   * @param octokitToken - Optional GitHub OAuth token from cookies
   * @param posthogId - Persistent anonymous ID from POSTHOG_ID cookie
   * @param event - Event properties including ontologyId, diagramType, hasSearch, expandedCount, and highlightNodeId
   */
  async trackUpdateOntologyView(
    octokitToken: string | undefined,
    posthogId: string,
    event: UpdateOntologyViewEvent
  ): Promise<void> {
    const distinctId = await this.getDistinctId(octokitToken, posthogId)
    return this.captureEvent(distinctId, 'updateOntologyView', event)
  }

  /**
   * Track node selection event
   * @param octokitToken - Optional GitHub OAuth token from cookies
   * @param posthogId - Persistent anonymous ID from POSTHOG_ID cookie
   * @param event - Event properties including ontologyId, entityId, and entityKind
   */
  async trackNodeSelected(
    octokitToken: string | undefined,
    posthogId: string,
    event: NodeSelectedEvent
  ): Promise<void> {
    const distinctId = await this.getDistinctId(octokitToken, posthogId)
    return this.captureEvent(distinctId, 'nodeSelected', event)
  }

  /**
   * Track mode toggle event (view/edit)
   * @param octokitToken - Optional GitHub OAuth token from cookies
   * @param posthogId - Persistent anonymous ID from POSTHOG_ID cookie
   * @param event - Event properties including ontologyId and editMode
   */
  async trackModeToggle(octokitToken: string | undefined, posthogId: string, event: ModeToggleEvent): Promise<void> {
    const distinctId = await this.getDistinctId(octokitToken, posthogId)
    return this.captureEvent(distinctId, 'modeToggle', event)
  }

  /**
   * Track error event
   * @param octokitToken - Optional GitHub OAuth token from cookies
   * @param posthogId - Persistent anonymous ID from POSTHOG_ID cookie
   * @param event - Event properties including message, stack, code, path, method
   */
  async trackError(octokitToken: string | undefined, posthogId: string, event: ErrorEvent): Promise<void> {
    const distinctId = await this.getDistinctId(octokitToken, posthogId)
    return this.captureEvent(distinctId, 'error', event)
  }

  /**
   * Identify a user with properties
   * @param distinctId - User identifier (anonymousId or github:username)
   * @param properties - Optional user properties to associate with the distinct ID
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
   * Links two distinct IDs together, typically used to connect an anonymous ID to a GitHub user
   * @param distinctId - Primary user identifier (typically github:username)
   * @param alias - Secondary identifier to link (typically anonymousId from POSTHOG_ID cookie)
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
}
