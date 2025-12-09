import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/core'
import { RequestError } from '@octokit/request-error'
import { createHash } from 'node:crypto'
import { container, inject, singleton } from 'tsyringe'
import { z } from 'zod'

import { Env } from '../env/index.js'
import { GithubNotFound, GithubReqError, GithubStateError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'
import { OAuthToken, ViewAndEditPermission, viewAndEditPermissions } from '../models/github.js'
import { Cache, type ICache } from './cache.js'
import { safeUrl } from './url.js'

const env = container.resolve(Env)

const perPage = env.get('GH_PER_PAGE')
const privateKey = Buffer.from(env.get('GH_APP_PRIVATE_KEY'), 'base64').toString('utf-8')

export const authRedirectURL = (returnUrl: string): string => {
  return safeUrl(`https://github.com/login/oauth/authorize`, {
    client_id: env.get('GH_CLIENT_ID'),
    redirect_uri: `${env.get('GH_REDIRECT_ORIGIN')}/github/callback?returnUrl=${returnUrl}`,
  })
}

@singleton()
export class GithubRequest {
  constructor(
    @inject(Logger) private logger: ILogger,
    @inject(Cache) private cache: ICache
  ) {}

  getInstallations = async (token: string | undefined, page: number) => {
    if (!token) throw new GithubReqError('Missing GitHub token')
    const octokit = new Octokit({ auth: token })

    const response = await this.requestWrapper(async () =>
      octokit.request('GET /user/installations', {
        per_page: perPage,
        page,
      })
    )

    return response.data.installations
  }

  getRepos = async (token: string | undefined, page: number) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('GET /user/repos', {
        per_page: perPage,
        page,
      })
    )
    return response.data
  }

  getInstallationRepos = async (token: string | undefined, installationId: number, page: number) => {
    if (!token) throw new GithubReqError('Missing GitHub token')
    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('GET /user/installations/{installation_id}/repositories', {
        installation_id: installationId,
        per_page: perPage,
        page,
      })
    )
    return response.data.repositories.filter((r) => r.permissions?.push)
  }

  getBranches = async (token: string | undefined, owner: string, repo: string, page: number) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('GET /repos/{owner}/{repo}/branches', {
        owner,
        repo,
        per_page: perPage,
        page,
      })
    )
    return response.data
  }

  getContents = async (token: string | undefined, owner: string, repo: string, path: string, ref: string) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path,
        ref,
      })
    )

    if (!Array.isArray(response.data))
      throw new GithubReqError('Attempted to get contents of a file rather than directory')

    return response.data
  }

  getAccessToken = async (code: string): Promise<OAuthToken> => {
    const url = `https://github.com/login/oauth/access_token`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.get('GH_CLIENT_ID'),
        client_secret: env.get('GH_CLIENT_SECRET'),
        code,
      }),
    })
    const json = await response.json()

    if (!response.ok || !json.access_token) {
      throw new GithubReqError(`Unexpected error fetching GitHub token`)
    }

    return json as OAuthToken
  }

  getRepoPermissions = async (token: string, owner: string, repo: string): Promise<ViewAndEditPermission> => {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const cacheKey = `github_permissions_${tokenHash}_${owner}_${repo}`
    const cached = this.cache.get(cacheKey, z.enum(viewAndEditPermissions))
    if (cached) return cached

    const permission = await this.resolveRepoPermissions(token, owner, repo)

    // Cache permissions for 1 minute to balance performance and freshness
    this.cache.set(cacheKey, permission, 60 * 1000)

    return permission
  }

  private resolveRepoPermissions = async (
    token: string,
    owner: string,
    repo: string
  ): Promise<ViewAndEditPermission> => {
    const userOctokit = new Octokit({ auth: token })

    const userResponse = await this.requestWrapper(async () =>
      userOctokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      })
    ).catch((error) => {
      if (error instanceof GithubNotFound) return null
      throw error
    })

    if (!userResponse?.data.permissions?.pull) {
      return 'unauthorised'
    }

    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.get('GH_CLIENT_ID'),
        privateKey,
      },
    })

    const installationRes = await this.requestWrapper(async () =>
      appOctokit.request('GET /repos/{owner}/{repo}/installation', {
        owner,
        repo,
      })
    ).catch((err) => {
      if (err instanceof GithubNotFound) return null
      throw err
    })

    if (
      installationRes?.data.permissions.contents === 'write' &&
      installationRes.data.permissions.pull_requests === 'write'
    ) {
      return 'edit'
    }

    return 'view'
  }

  getAuthenticatedUser = async (token: string) => {
    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () => octokit.request('GET /user'))
    return {
      login: response.data.login,
      id: response.data.id,
      email: response.data.email,
      name: response.data.name,
    }
  }

  getZip = async (token: string | undefined, owner: string, repo: string, ref: string) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })

    const response = await this.requestWrapper(async () =>
      octokit.request('GET /repos/{owner}/{repo}/zipball/{ref}', {
        owner,
        repo,
        ref,
      })
    )

    const contentLength = response.headers['content-length']

    if (contentLength && contentLength > env.get('UPLOAD_LIMIT_MB') * 1024 * 1024) {
      throw new GithubReqError(`Total upload must be less than ${env.get('UPLOAD_LIMIT_MB')}MB`)
    }

    return response.data as ArrayBuffer
  }

  getBranch = async (token: string, owner: string, repo: string, branch: string) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    try {
      const response = await this.requestWrapper(async () =>
        octokit.request(`GET /repos/{owner}/{repo}/git/ref/heads/{branch}`, {
          owner,
          repo,
          branch,
        })
      )
      return response.data
    } catch (error) {
      if (error instanceof GithubNotFound) {
        return null
      }
      throw error
    }
  }

  updateBranch = async (token: string, owner: string, repo: string, branch: string, sha: string) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
        owner,
        repo,
        ref: `heads/${branch}`,
        sha,
        force: false,
      })
    )
    return response.data
  }

  createBranch = async (token: string, owner: string, repo: string, branch: string, sha: string) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha,
      })
    )
    return response.data
  }

  createBlob = async (token: string, owner: string, repo: string, content: string) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('POST /repos/{owner}/{repo}/git/blobs', {
        owner,
        repo,
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      })
    )
    return response.data
  }

  createTree = async (
    token: string,
    owner: string,
    repo: string,
    baseTree: string,
    tree: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }>
  ) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('POST /repos/{owner}/{repo}/git/trees', {
        owner,
        repo,
        base_tree: baseTree,
        tree,
      })
    )
    return response.data
  }

  createCommit = async (
    token: string,
    owner: string,
    repo: string,
    message: string,
    tree: string,
    parents: string[]
  ) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('POST /repos/{owner}/{repo}/git/commits', {
        owner,
        repo,
        message,
        tree,
        parents,
      })
    )
    return response.data
  }

  createPullRequest = async (
    token: string,
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body: string
  ) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner,
        repo,
        title,
        head,
        base,
        body,
      })
    )
    return response.data
  }

  public async requestWrapper<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request()
    } catch (err) {
      this.logger.debug(err, 'GitHub API request failed')

      if (err instanceof RequestError) {
        if (err.status === 404) {
          throw new GithubNotFound(`'${err.response?.url}' not found`)
        }
        if (err.status === 409 || err.status === 422) {
          throw new GithubStateError('GitHub repository state conflict. Please refresh and try again.')
        }
      }

      throw new GithubReqError('GitHub API request failed')
    }
  }
}
