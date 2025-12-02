import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/core'
import { RequestError } from '@octokit/request-error'
import { container, inject, singleton } from 'tsyringe'

import { Env } from '../env/index.js'
import { GithubNotFound, GithubReqError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'
import { OAuthToken, ViewAndEditPermission } from '../models/github.js'
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
  constructor(@inject(Logger) private logger: ILogger) {}

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

  getPushableRepos = async (token: string | undefined, page: number) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('GET /user/installations', {
        per_page: perPage,
        page,
      })
    )
    const installations = response.data
    if (installations.total_count === 0) {
      return []
    }

    const installation = installations.installations.find((inst) => inst.client_id === env.get('GH_CLIENT_ID'))

    if (!installation) {
      return []
    }

    const reposResponse = await this.requestWrapper(async () =>
      octokit.request('GET /user/installations/{installation_id}/repositories', {
        installation_id: installation.id,
        per_page: perPage,
        page,
      })
    )
    return reposResponse.data.repositories.filter((repo) => repo.permissions?.push)
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
    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.get('GH_CLIENT_ID'),
        privateKey,
      },
    })

    const response = await this.requestWrapper(async () =>
      appOctokit.request('GET /repos/{owner}/{repo}/installation', {
        owner,
        repo,
      })
    ).catch((err) => {
      if (err instanceof GithubNotFound) return null
      throw err
    })

    if (response?.data.permissions.contents === 'write' && response.data.permissions.pull_requests === 'write') {
      return 'edit'
    }

    return this.getUserPermissions(token, owner, repo)
  }

  getUserPermissions = async (token: string, owner: string, repo: string): Promise<ViewAndEditPermission> => {
    const octokit = new Octokit({ auth: token })

    const response = await this.requestWrapper(async () =>
      octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      })
    ).catch((error) => {
      if (error instanceof GithubNotFound) return null
      throw error
    })

    if (response?.data.permissions?.pull) return 'view'
    return 'unauthorised'
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

  public async requestWrapper<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request()
    } catch (err) {
      this.logger.debug(err, 'GitHub API request failed')

      if (err instanceof RequestError && err.status === 404) {
        throw new GithubNotFound(`'${err.response?.url}' not found`)
      }

      throw new GithubReqError('GitHub API request failed')
    }
  }
}
