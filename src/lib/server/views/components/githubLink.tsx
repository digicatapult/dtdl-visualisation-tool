/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { isGithubModel, ModelRow } from '../../../db/types.js'

export const GithubLink = ({ model, swapOutOfBand }: { model: ModelRow; swapOutOfBand?: boolean }): JSX.Element => {
  if (!isGithubModel(model)) return <></>

  const { owner, repo, is_out_of_sync, commit_hash, base_branch } = model
  return (
    <div id="github-link" hx-swap-oob={swapOutOfBand ? 'true' : undefined}>
      <a
        href={`https://github.com/${owner}/${repo}/tree/${commit_hash}`}
        target="_blank"
        class="new-tab-link"
        title="View on GitHub"
      >
        {`Source commit ↗`}
      </a>

      <a
        href={`https://github.com/${owner}/${repo}/tree/${base_branch}`}
        target="_blank"
        class="new-tab-link"
        title="View base branch"
      >
        {escapeHtml(`Source branch ${is_out_of_sync ? '(out of sync)' : ''} ↗`)}
      </a>
    </div>
  )
}
