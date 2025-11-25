import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/core'
import { RequestError } from '@octokit/request-error'
import { readFileSync } from 'fs'
import { container, inject, singleton } from 'tsyringe'

import { Env } from '../env/index.js'
import { GithubNotFound, GithubReqError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'
import { OAuthToken, ViewAndEditPermission } from '../models/github.js'
import { safeUrl } from './url.js'

const env = container.resolve(Env)

const perPage = env.get('GH_PER_PAGE')

export const authRedirectURL = (returnUrl: string): string => {
  return safeUrl(`https://github.com/login/oauth/authorize`, {
    client_id: env.get('GH_CLIENT_ID'),
    redirect_uri: `${env.get('GH_REDIRECT_ORIGIN')}/github/callback?returnUrl=${returnUrl}`,
    scope: 'repo',
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
    const privateKey = readFileSync('test.pem', 'utf-8')
    const appId = 1113102

    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
      },
    })

    const { data: installation } = await this.requestWrapper(async () =>
      appOctokit.request('GET /repos/{owner}/{repo}/installation', {
        owner,
        repo,
      })
    )
    if (installation.permissions.contents === 'write' && installation.permissions.pull_requests === 'write') {
      return 'edit'
    }

    return 'unauthorised'

    // const userOctokit = new Octokit({ auth: token })
    // const { data: userInstallations } = await this.requestWrapper(async () =>
    //   userOctokit.request('GET /user/installations', {
    //     per_page: perPage,
    //     page: 1,
    //   })
    // )

    // const hasInstallation = userInstallations.installations.some(
    //   (inst) => inst.id === installation.id && inst.client_id === env.get('GH_CLIENT_ID')
    // )

    // if (!hasInstallation) {
    //   return 'unauthorised'
    // }

    // const { data: repos } = await this.requestWrapper(async () =>
    //   userOctokit.request('GET /user/installations/{installation_id}/repositories', {
    //     installation_id: installation.id,
    //     per_page: perPage,
    //   })
    // )

    //const repoPermissions = repos.repositories.find((r) => r.full_name === `${owner}/${repo}`)?.permissions

    if (repoPermissions?.push) {
      return 'edit'
    } else if (repoPermissions?.pull) {
      return 'view'
    }
    return 'unauthorised'
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

  createOrUpdateFile = async (
    token: string,
    owner: string,
    repo: string,
    path: string,
    branch: string,
    content: string,
    message: string,
    sha?: string
  ) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        ...(sha && { sha }),
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

  getTree = async (token: string, owner: string, repo: string, treeSha: string) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
        owner,
        repo,
        tree_sha: treeSha,
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

  updateRef = async (token: string, owner: string, repo: string, ref: string, sha: string) => {
    if (!token) throw new GithubReqError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    const response = await this.requestWrapper(async () =>
      octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
        owner,
        repo,
        ref,
        sha,
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
    body?: string
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
        if (err.status === 404) throw new GithubNotFound(`'${err.response?.url}' not found`)
        throw new GithubReqError(err.message)
      }

      throw new GithubReqError('GitHub API request failed')
    }
  }
}
