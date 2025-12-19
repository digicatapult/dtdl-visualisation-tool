/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { DeletableEntities } from '../../models/controllerTypes.js'

export const DeleteDialog = ({
  displayName,
  entityKind,
  definedIn,
  definedInDisplayName,
  contentName,
  extendedBys,
}: {
  displayName?: string
  entityKind?: DeletableEntities
  definedIn?: string
  definedInDisplayName?: string
  contentName?: string
  extendedBys?: string[]
} = {}): JSX.Element => {
  const isInterface = entityKind === 'Interface'
  const displayDefinedIn = definedInDisplayName !== undefined
  const displayExtendedBys = extendedBys !== undefined && extendedBys.length > 0
  return (
    <dialog id="delete-dialog">
      <div id="modal-wrapper">
        <h3>Delete {entityKind}</h3>
        <p>{escapeHtml(displayName ?? 'No display name')}</p>
        {displayDefinedIn && <p>Defined in: {escapeHtml(definedInDisplayName ?? 'No defined in display name')}</p>}
        <p>
          Type
          <b>
            <em> delete </em>
          </b>
          to continue
        </p>
        <input
          type="text"
          id="delete-confirmation"
          oninput="document.getElementById('delete-button').disabled = this.value !== 'delete'"
        />
        <br />
        <p>Are you sure you want to delete this {entityKind}?</p>
        {displayExtendedBys && (
          <>
            <p>Please note, it will also delete the following:</p>
            <div id="extended-by-list">
              {extendedBys.map((displayName) => (
                <p>{escapeHtml(displayName)}</p>
              ))}
            </div>
          </>
        )}
        <button
          id="delete-button"
          hx-delete={isInterface ? `entity/${definedIn}` : `entity/${definedIn}/content`}
          hx-include="#sessionId, #svgWidth, #svgHeight, #currentZoom, #currentPanX, #currentPanY, #search, #diagram-type-select"
          hx-swap="outerHTML transition:true"
          hx-target="#mermaid-output"
          hx-vals={isInterface ? '' : JSON.stringify({ contentName })}
          hx-indicator="#spinner"
          class="rounded-button"
          disabled
          hx-on--after-request="globalThis.hideDeleteDialog()"
        >
          Delete {entityKind}
        </button>

        <form method="dialog">
          <button class="modal-button" />
        </form>
      </div>
    </dialog>
  )
}
