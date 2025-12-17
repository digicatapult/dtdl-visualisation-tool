/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { UUID } from '../../models/strings.js'

export const PublishDialog = ({
  ontologyId,
  baseBranch,
  isOutOfSync,
}: { ontologyId?: UUID; baseBranch?: string; isOutOfSync?: boolean } = {}): JSX.Element => {
  const defaultBranchName = `ontology-update-${Date.now()}`

  return (
    <dialog id="publish-dialog">
      <form
        hx-post="/publish"
        hx-target=".toast-wrapper:empty"
        hx-swap="beforeend"
        hx-vals={JSON.stringify({
          ontologyId,
        })}
        hx-on--after-request="document.getElementById('publish-dialog').close()"
        hx-indicator="#spin"
      >
        <div class="modal-content">
          <h3>Publish Changes</h3>
          {isOutOfSync && (
            <div id="publish-warning">
              <img src="/public/images/warning.svg" />
              <p>Ontology is out-of-sync with the source branch on GitHub</p>
            </div>
          )}
          <label for="commitMessage">Commit message</label>
          <input type="text" id="commitMessage" name="commitMessage" value="Update DTDL" required />
          <div class="radio-group">
            <label title={isOutOfSync ? 'Disabled because ontology is out-of-sync' : ''}>
              <input
                class="circle-radio"
                type="radio"
                name="publishType"
                value="currentBranch"
                checked={!isOutOfSync}
                disabled={isOutOfSync}
                onchange="globalThis.togglePrFields(false)"
              />
              Commit directly to '{escapeHtml(baseBranch ?? '')}' branch
            </label>
            <label>
              <input
                class="circle-radio"
                type="radio"
                name="publishType"
                value="newBranch"
                checked={isOutOfSync}
                onchange="globalThis.togglePrFields(true)"
              />
              Create a new branch for this commit and start a pull request
            </label>
          </div>
          <label for="prTitle">Pull Request title</label>
          <input
            type="text"
            id="prTitle"
            name="prTitle"
            value="Update ontology files from DTDL visualisation tool"
            class="pr-fields"
          />
          <label for="description">Extended description</label>
          <textarea id="description" name="description" rows="4" class="pr-fields">
            This PR was automatically created by the DTDL visualisation tool.
          </textarea>
          <label for="branchName">Branch name</label>
          <input
            type="text"
            id="branchName"
            name="branchName"
            value={defaultBranchName}
            oninput="globalThis.validateBranchName(this)"
            class="pr-fields"
          />
          <button type="submit" class="rounded-button">
            Publish Changes
          </button>
          <div id="spin" class="spinner" />
        </div>
      </form>
      <form method="dialog">
        <button class="modal-button" />
      </form>
    </dialog>
  )
}
