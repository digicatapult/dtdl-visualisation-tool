import express from 'express'
import { randomUUID } from 'node:crypto'
import { FormField, Middlewares, Post, Request, Route, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'
import { ModelDb } from '../../db/modelDb.js'
import { InternalError } from '../errors.js'
import { octokitTokenCookie } from '../models/cookieNames.js'
import { GithubRequest } from '../utils/githubRequest.js'
import { HTMLController } from './HTMLController.js'
import { checkEditPermission } from './helpers.js'

@injectable()
@Route('/publish')
export class PublishController extends HTMLController {
  constructor(
    private modelDb: ModelDb,
    private githubRequest: GithubRequest
  ) {
    super()
  }

  @SuccessResponse(200)
  @Post('')
  @Middlewares(checkEditPermission)
  public async publish(@Request() req: express.Request, @FormField() ontologyId: string): Promise<void> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    if (!octokitToken) {
      throw new InternalError('Missing GitHub token')
    }

    if (!ontologyId) {
      throw new InternalError('Missing ontology ID')
    }

    const a = await this.githubRequest.checkTokenPermissions(octokitToken)
    console.log(a)
    const { owner, repo, base_branch } = await this.modelDb.getModelById(ontologyId)
    if (!owner || !repo || !base_branch) {
      throw new InternalError('Ontology is not from GitHub or missing base branch information')
    }

    const files = await this.modelDb.getDtdlFiles(ontologyId)

    const baseBranchData = await this.githubRequest.getBranch(octokitToken, owner, repo, base_branch)
    if (!baseBranchData) {
      throw new InternalError(`Base branch ${base_branch} not found`)
    }

    const timestamp = Date.now()
    const branchName = `ontology-update-${timestamp}`

    const existingBranch = await this.githubRequest.getBranch(octokitToken, owner, repo, branchName)
    const finalBranchName = existingBranch ? `ontology-update-${timestamp}-${randomUUID().slice(0, 8)}` : branchName

    await this.githubRequest.createBranch(octokitToken, owner, repo, finalBranchName, baseBranchData.object.sha)

    const blobs = await Promise.all(
      files.map(async (file) => {
        const blob = await this.githubRequest.createBlob(octokitToken, owner, repo, file.source)
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        }
      })
    )

    const tree = await this.githubRequest.createTree(octokitToken, owner, repo, baseBranchData.object.sha, blobs)

    const commitMessage = `Update ontology files from DTDL visualisation tool`
    const commit = await this.githubRequest.createCommit(octokitToken, owner, repo, commitMessage, tree.sha, [
      baseBranchData.object.sha,
    ])

    await this.githubRequest.updateRef(octokitToken, owner, repo, `heads/${finalBranchName}`, commit.sha)

    const prTitle = `Update ontology files`
    const prBody = `This PR was automatically created by the DTDL visualisation tool.\n\nUpdated ${files.length} file(s).`

    await this.githubRequest.createPullRequest(octokitToken, owner, repo, prTitle, finalBranchName, base_branch, prBody)

    this.setStatus(302)
    this.setHeader('HX-Redirect', `/ontology/${ontologyId}/view`)
  }
}
