import { Octokit } from '@octokit/core'
import { Endpoints } from '@octokit/types'
import { container, inject, singleton } from 'tsyringe'
import { Env } from '../env.js'
import { GithubAuthError } from '../errors.js'

import { Logger, type ILogger } from '../logger.js'

type getUserReposResponse = Endpoints['GET /user/repos']['response']
type getBranchesResponse = Endpoints['GET /repos/{owner}/{repo}/branches']['response']
type getRepoContentsResponse = Endpoints['GET /repos/{owner}/{repo}/contents/{path}']['response']

const env = container.resolve(Env)

const perPage = env.get('GH_PER_PAGE')

@singleton()
export class GithubRequest {
  constructor(@inject(Logger) private logger: ILogger) {}

  getRepos = async (token: string | undefined, page: number): Promise<getUserReposResponse> => {
    if (!token) throw new GithubAuthError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    return this.requestWrapper(async () =>
      octokit.request('GET /user/repos', {
        per_page: perPage,
        page,
      })
    )
  }

  getBranches = async (
    token: string | undefined,
    owner: string,
    repo: string,
    page: number
  ): Promise<getBranchesResponse> => {
    if (!token) throw new GithubAuthError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    return this.requestWrapper(async () =>
      octokit.request('GET /repos/{owner}/{repo}/branches', {
        owner,
        repo,
        per_page: perPage,
        page,
      })
    )
  }

  getContents = async (
    token: string | undefined,
    owner: string,
    repo: string,
    path: string,
    ref: string
  ): Promise<getRepoContentsResponse> => {
    if (!token) throw new GithubAuthError('Missing GitHub token')

    const octokit = new Octokit({ auth: token })
    return this.requestWrapper(async () =>
      octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path,
        ref,
      })
    )
  }

  private async requestWrapper<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request()
    } catch (err) {
      this.logger.debug('GitHub API request failed', err)
      throw new GithubAuthError('GitHub API request failed')
    }
  }
}
