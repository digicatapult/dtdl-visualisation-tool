import { FormField, Get, Middlewares, Post, Produces, Query, Request, Route, SuccessResponse } from '@tsoa/runtime'
import express from 'express'
import * as prettier from 'prettier'
import { inject, injectable } from 'tsyringe'
import { ModelDb } from '../../db/modelDb.js'
import { DataError, GithubReqError } from '../errors.js'
import { octokitTokenCookie } from '../models/cookieNames.js'
import { GithubRequest } from '../utils/githubRequest.js'
import MermaidTemplates from '../views/components/mermaid.js'
import { successToast } from '../views/components/toast.js'
import { HTML, HTMLController } from './HTMLController.js'
import { checkEditPermission } from './helpers.js'
@injectable()
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
  public async dialog(@Query() ontologyId: string): Promise<HTML> {
    return this.html(this.templates.publishDialog({ ontologyId }))
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
    @FormField() branchName: string
  ): Promise<HTML> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    if (!octokitToken) {
      throw new GithubReqError('Missing GitHub token')
    }

    const { owner, repo, base_branch: baseBranch } = await this.modelDb.getModelById(ontologyId)
    if (!owner || !repo || !baseBranch) {
      throw new DataError('Ontology is not from GitHub or missing base branch information')
    }

    const files = await this.modelDb.getDtdlFiles(ontologyId)

    const baseBranchData = await this.githubRequest.getBranch(octokitToken, owner, repo, baseBranch)
    if (!baseBranchData) {
      throw new DataError(`Base branch ${baseBranch} not found`)
    }

    const existingRemoteBranch = await this.githubRequest.getBranch(octokitToken, owner, repo, branchName)
    if (existingRemoteBranch) {
      throw new DataError(`Branch with name ${branchName} already exists`)
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

    await this.githubRequest.createBranch(octokitToken, owner, repo, branchName, commit.sha)

    const pr = await this.githubRequest.createPullRequest(
      octokitToken,
      owner,
      repo,
      prTitle,
      branchName,
      baseBranch,
      description
    )

    const toast = successToast('Published successfully', pr.html_url, 'View Pull Request')
    this.setHeader('HX-Trigger-After-Settle', JSON.stringify({ toastEvent: { dialogId: toast.dialogId } }))
    return this.html(toast.response)
  }
}
