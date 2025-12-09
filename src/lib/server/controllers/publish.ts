import { FormField, Get, Middlewares, Post, Produces, Query, Request, Route, SuccessResponse } from '@tsoa/runtime'
import express from 'express'
import * as prettier from 'prettier'
import { inject, injectable } from 'tsyringe'
import { ModelDb } from '../../db/modelDb.js'
import { DataError, GithubReqError } from '../errors.js'
import { octokitTokenCookie } from '../models/cookieNames.js'
import { GithubRequest } from '../utils/githubRequest.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { successToast, Toast } from '../views/components/toast.js'
import { HTML, HTMLController } from './HTMLController.js'
import { checkEditPermission, checkRemoteBranch } from './helpers.js'
@injectable()
@Middlewares(checkEditPermission)
@Route('/publish')
export class PublishController extends HTMLController {
  constructor(
    private modelDb: ModelDb,
    private githubRequest: GithubRequest,
    @inject(MermaidTemplates) private templates: MermaidTemplates
  ) {
    super()
  }

  @Get('/dialog')
  @Produces('text/html')
  public async dialog(@Request() req: express.Request, @Query() ontologyId: string): Promise<HTML> {
    const { base_branch: baseBranch, is_out_of_sync: isOutOfSync } = await checkRemoteBranch(ontologyId, req)
    return this.html(this.templates.publishDialog({ ontologyId, baseBranch, isOutOfSync }))
  }

  @SuccessResponse(200)
  @Post('')
  @Middlewares(checkEditPermission)
  public async publish(
    @Request() req: express.Request,
    @FormField() ontologyId: string,
    @FormField() commitMessage: string,
    @FormField() prTitle: string,
    @FormField() description: string,
    @FormField() publishType: 'newBranch' | 'currentBranch',
    @FormField() branchName?: string
  ): Promise<HTML> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    if (!octokitToken) {
      throw new GithubReqError('Missing GitHub token')
    }

    const { owner, repo, base_branch: baseBranch } = await this.modelDb.getGithubModelById(ontologyId)

    const files = await this.modelDb.getDtdlFiles(ontologyId)

    const baseBranchData = await this.githubRequest.getBranch(octokitToken, owner, repo, baseBranch)
    if (!baseBranchData) {
      throw new DataError(`Base branch ${baseBranch} not found`)
    }

    if (publishType === 'newBranch') {
      if (!branchName) {
        throw new DataError('Branch name is required for new branch')
      }
      const existingRemoteBranch = await this.githubRequest.getBranch(octokitToken, owner, repo, branchName)
      if (existingRemoteBranch) {
        throw new DataError(`Branch with name ${branchName} already exists`)
      }
    }

    const blobs = await Promise.all(
      files.map(async (file) => {
        const formattedSource = await prettier.format(file.source, { parser: 'json' })
        const blob = await this.githubRequest.createBlob(octokitToken, owner, repo, formattedSource)
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        }
      })
    )

    const tree = await this.githubRequest.createTree(octokitToken, owner, repo, baseBranchData.object.sha, blobs)

    const commit = await this.githubRequest.createCommit(octokitToken, owner, repo, commitMessage, tree.sha, [
      baseBranchData.object.sha,
    ])

    let toast: Toast
    if (publishType === 'newBranch') {
      // branchName is checked above
      await this.githubRequest.createBranch(octokitToken, owner, repo, branchName!, commit.sha)

      const pr = await this.githubRequest.createPullRequest(
        octokitToken,
        owner,
        repo,
        prTitle,
        branchName!,
        baseBranch,
        description
      )

      toast = successToast('Published successfully', pr.html_url, 'View Pull Request')
    } else {
      await this.githubRequest.updateBranch(octokitToken, owner, repo, baseBranch, commit.sha)
      await this.modelDb.updateModel(ontologyId, { is_out_of_sync: false, commit_hash: commit.sha })

      toast = successToast(
        `Published successfully`,
        `https://github.com/${owner}/${repo}/tree/${baseBranch}`,
        'View branch'
      )
    }
    this.setHeader('HX-Trigger-After-Settle', JSON.stringify({ toastEvent: { dialogId: toast.dialogId } }))
    return this.html(toast.response)
  }
}
