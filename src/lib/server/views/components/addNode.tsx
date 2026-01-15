/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { DtdlId } from '../../models/strings.js'
import { MAX_DISPLAY_NAME_LENGTH, MAX_VALUE_LENGTH } from '../../utils/dtdl/entityUpdate.js'
import { DtdlPath } from '../../utils/dtdl/parser.js'

const commonRerenderAttrs = {
  'hx-target': '#mermaid-output',
  'hx-swap': 'outerHTML  transition:true',
  'hx-include': '#viewId, #search-panel, input[name="navigationPanelTab"], #navigationPanelExpanded',
  'hx-indicator': '#spinner',
  'hx-disabled-elt': 'select',
} as const

export const AddNode = ({
  dtdlModelId,
  swapOutOfBand,
  displayNameIdMap,
  folderTree,
  entityId,
  folderTreeLevel,
}: {
  dtdlModelId: string
  swapOutOfBand?: boolean
  displayNameIdMap: Record<string, string>
  folderTree: DtdlPath[]
  entityId?: DtdlId
  folderTreeLevel: (props: {
    highlightedEntityId?: DtdlId
    highlightedEntitySet: Set<DtdlPath>
    fileTree: DtdlPath[]
    pathPrefix?: string
    selectedPath?: string | null
  }) => JSX.Element
}): JSX.Element => {
  const reducer = (set: Set<DtdlPath> | null, path: DtdlPath): Set<DtdlPath> | null => {
    if (set) {
      return set
    }

    if (path.type === 'file' || path.type === 'directory' || (path.type === 'fileEntry' && path.id !== entityId)) {
      const entries = path.entries.reduce(reducer, null)
      if (entries === null) {
        return null
      }
      entries.add(path)
      return entries
    }

    if (path.id === entityId) {
      return new Set([path])
    }

    return null
  }
  const defaultExpandSet = folderTree.reduce(reducer, null) || new Set<DtdlPath>()

  return (
    <aside id="navigation-panel" hx-swap-oob={swapOutOfBand ? 'true' : undefined} aria-expanded="" class="edit">
      <input id="navigationPanelExpanded" name="navigationPanelExpanded" type="hidden" value="true" />
      <button id="navigation-panel-button" onclick="globalThis.toggleNavPanel(event)"></button>

      <div id="navigation-panel-controls">
        <label>
          <h2>New Node</h2>
          <input type="radio" name="navigationPanelTab" value="details" checked />
        </label>
      </div>

      <form {...commonRerenderAttrs} id="create-node-form" hx-post={`/ontology/${dtdlModelId}/entity/new-node`}>
        <div id="navigation-panel-content">
          <section>
            <h3>Basic Information</h3>

            <p>
              <b>Display Name:</b>
            </p>
            <input
              type="text"
              name="displayName"
              placeholder="Enter display name"
              maxlength={MAX_DISPLAY_NAME_LENGTH}
              class="nav-panel-editable"
              required
            />

            <p>
              <b>Description:</b>
            </p>
            <textarea
              name="description"
              placeholder="Enter description"
              maxlength={MAX_VALUE_LENGTH}
              class="nav-panel-editable multiline"
            />

            <p>
              <b>Comment:</b>
            </p>
            <textarea
              name="comment"
              placeholder="Enter comment"
              maxlength={MAX_VALUE_LENGTH}
              class="nav-panel-editable multiline"
            />

            <p>
              <b>Extends:</b>
            </p>
            <select name="extends" class="nav-panel-editable">
              <option value="">None</option>

              {Object.entries(displayNameIdMap).map(([label, value]) => (
                <option value={escapeHtml(value)}>{escapeHtml(label)}</option>
              ))}
            </select>
            <small>DTDL allows only single inheritance. Select one node to extend, or choose 'None'.</small>
            <p>
              <b>Select Folder*:</b>
            </p>
            <input type="hidden" name="folderPath" id="selectedFolderPath" required value="" />
            <div id="selectedFolder">
              <div class="accordion-parent">
                <button
                  type="button"
                  class={`folder-tree-button tree-icon no-arrow directory folder-tree-selected`.trim()}
                  onclick="globalThis.handleFolderSelection(event, '');"
                  data-folder-path=""
                >
                  Root
                </button>
              </div>
              {folderTreeLevel({
                highlightedEntitySet: defaultExpandSet,
                fileTree: folderTree,
                pathPrefix: '',
                selectedPath: null,
              })}
            </div>
            <small>Click a folder or root to select where to save the new node.</small>

            <button type="submit" class="rounded-button" id="create-new-node-button">
              Create Node
            </button>
            <button
              type="button"
              id="cancel-button"
              class="rounded-button"
              hx-get={`/ontology/${dtdlModelId}/edit-model`}
              hx-target="#navigation-panel"
              hx-swap="outerHTML"
              hx-include="#viewId, #navigationPanelExpanded"
              hx-vals='{"editMode": true}'
            >
              Cancel
            </button>
          </section>
        </div>
      </form>
    </aside>
  )
}
