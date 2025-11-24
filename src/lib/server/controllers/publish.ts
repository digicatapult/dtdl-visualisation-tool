import express from 'express'
import { randomUUID } from 'node:crypto'
import * as prettier from 'prettier'
import { FormField, Get, Middlewares, Post, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import { ModelDb } from '../../db/modelDb.js'
import { InternalError } from '../errors.js'
import { octokitTokenCookie } from '../models/cookieNames.js'
import { GithubRequest } from '../utils/githubRequest.js'
import { successToast } from '../views/components/errors.js'
import MermaidTemplates from '../views/components/mermaid.js'
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
    return this.html(this.templates.PublishDialog({ ontologyId }))
  }

  @SuccessResponse(200)
  @Post('')
  @Middlewares(checkEditPermission)
  public async publish(
    @Request() req: express.Request,
    @FormField() ontologyId: string,
    @FormField() commitMessage: string,
    @FormField() description: string,
    @FormField() branchName: string
  ): Promise<HTML> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    if (!octokitToken) {
      throw new InternalError('Missing GitHub token')
    }

    if (!ontologyId) {
      throw new InternalError('Missing ontology ID')
    }

    const { owner, repo, base_branch } = await this.modelDb.getModelById(ontologyId)
    if (!owner || !repo || !base_branch) {
      throw new InternalError('Ontology is not from GitHub or missing base branch information')
    }

    const files = await this.modelDb.getDtdlFiles(ontologyId)

    const baseBranchData = await this.githubRequest.getBranch(octokitToken, owner, repo, base_branch)
    if (!baseBranchData) {
      throw new InternalError(`Base branch ${base_branch} not found`)
    }

    const existingBranch = await this.githubRequest.getBranch(octokitToken, owner, repo, branchName)
    const finalBranchName = existingBranch ? `${branchName}-${randomUUID().slice(0, 8)}` : branchName

    await this.githubRequest.createBranch(octokitToken, owner, repo, finalBranchName, baseBranchData.object.sha)

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

    await this.githubRequest.updateRef(octokitToken, owner, repo, `heads/${finalBranchName}`, commit.sha)

    const prTitle = commitMessage
    const prBody = description

    const pr = await this.githubRequest.createPullRequest(
      octokitToken,
      owner,
      repo,
      prTitle,
      finalBranchName,
      base_branch,
      prBody
    )

    const toast = successToast('Success', 'Ontology published successfully', pr.html_url)
    return this.html(toast.response)
  }
}
