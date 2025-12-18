/// <reference types="@kitajs/html/htmx.d.ts" />

import { container } from 'tsyringe'
import { Env } from '../../env/index.js'
import { commonUpdateAttrs } from './constants.js'

const env = container.resolve(Env)

export const EditToggle = ({
  canEdit,
  editDisabledReason,
}: {
  canEdit: boolean
  editDisabledReason?: 'errors' | 'permissions'
}): JSX.Element => {
  if (!env.get('EDIT_ONTOLOGY')) return <></>

  const getTooltip = () => {
    if (canEdit) return 'Click to edit ontology'
    if (editDisabledReason === 'errors') return 'You need to fix errors in ontology to be able to edit'
    return 'Only Ontologies from github that you have write permissions on, can be edited'
  }

  return (
    <div id="edit-controls">
      <div id="edit-toggle" title={getTooltip()} class={canEdit ? '' : 'disabled'}>
        <span class="view-text">View</span>
        <label class="switch">
          <form
            {...commonUpdateAttrs}
            hx-get="edit-model"
            hx-target="#navigation-panel"
            hx-trigger="checked"
            hx-swap="outerHTML"
            hx-vals="js:{ editMode: event.detail.checked }"
          >
            <input
              id="edit-toggle-checkbox"
              type="checkbox"
              disabled={!canEdit}
              onclick="globalThis.toggleEditSwitch(event)"
            />
            <span class="slider"></span>
          </form>
        </label>
        <span class="edit-text">Edit</span>
      </div>
      <div id="edit-buttons">
        <button
          {...commonUpdateAttrs}
          id="add-node-button"
          hx-get={`entity/add-new-node`}
          hx-target="#navigation-panel"
          hx-swap="outerHTML"
        ></button>
      </div>
    </div>
  )
}
