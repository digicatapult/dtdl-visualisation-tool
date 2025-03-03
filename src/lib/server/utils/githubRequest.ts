import { Octokit } from '@octokit/core'
import { RequestError } from '@octokit/request-error'
import { container, inject, singleton } from 'tsyringe'

import { Env } from '../env/index.js'
import { GithubReqError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'
import { OAuthToken } from '../models/github.js'
import { safeUrl } from './url.js'

const env = container.resolve(Env)

const perPage = env.get('GH_PER_PAGE')

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

  getRepoPermissions = async (token: string | undefined, owner: string, repo: string): Promise<boolean> => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      })
    )
    const data = response.data
    if (data.permissions?.push) {
      return true
    }
    return false
  }

  getOctokitToken = async (
    returnUrl: string,
    setStatus: (status: number) => void,
    setHeader: (key: string, value: string) => void,
    hxRedirect: boolean = true
  ): Promise<void> => {
    const callback = safeUrl(`${env.get('GH_REDIRECT_ORIGIN')}/github/callback`, { returnUrl })
    const githubAuthUrl = safeUrl(`https://github.com/login/oauth/authorize`, {
      client_id: env.get('GH_CLIENT_ID'),
      redirect_uri: callback,
    })

    setStatus(302)
    if (hxRedirect) setHeader('HX-Redirect', githubAuthUrl)
    else setHeader('Location', githubAuthUrl)
    return
  }

  private async requestWrapper<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request()
    } catch (err) {
      this.logger.debug('GitHub API request failed', err)

      if (err instanceof RequestError && err.status === 404) {
        throw new GithubReqError(`'${err.response?.url}' not found`)
      }

      throw new GithubReqError('GitHub API request failed')
    }
  }
}
