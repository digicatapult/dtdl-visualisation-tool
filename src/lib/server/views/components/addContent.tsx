/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { DtdlId } from '../../models/strings.js'

export const AddContentButtonContent = ({
  contentType,
  entityId,
}: {
  contentType: 'Property' | 'Relationship' | 'Telemetry' | 'Command'
  entityId: DtdlId
}): JSX.Element => {
  const formContainerId = `add-${contentType.toLowerCase()}-form-container`
  const btnId = `add-${contentType.toLowerCase()}-btn`

  return (
    <button
      id={btnId}
      class="add-content-button"
      hx-get={`entity/${entityId}/toggleAddContent?contentType=${contentType}`}
      hx-target={`#${formContainerId}`}
      hx-swap="innerHTML transition:true"
      title={`Add new ${contentType}`}
      onclick="this.classList.toggle('open')"
      hx-vals={`js:{isOpen: document.getElementById('${btnId}').classList.contains('open')}`}
    >
      +
    </button>
  )
}

export const AddContentButton = ({
  contentType,
  entityId,
}: {
  contentType: 'Property' | 'Relationship' | 'Telemetry' | 'Command'
  entityId: DtdlId
}): JSX.Element => {
  const containerId = `add-${contentType.toLowerCase()}-container`
  const btnContainerId = `add-${contentType.toLowerCase()}-btn-container`
  const formContainerId = `add-${contentType.toLowerCase()}-form-container`
  return (
    <div id={containerId} class="add-content-container">
      <div id={btnContainerId}>
        <AddContentButtonContent contentType={contentType} entityId={entityId} />
      </div>
      <div id={formContainerId}></div>
    </div>
  )
}

export const AddContentForm = ({
  contentType,
  entityId,
}: {
  contentType: 'Property' | 'Relationship' | 'Telemetry' | 'Command'
  entityId: DtdlId
}): JSX.Element => {
  const btnId = `add-${contentType.toLowerCase()}-btn`
  const formContainerId = `add-${contentType.toLowerCase()}-form-container`
  return (
    <form
      hx-post={`entity/${entityId}/content`}
      hx-ext="json-enc"
      hx-include="#viewId, #svgWidth, #svgHeight, #currentZoom, #currentPanX, #currentPanY, #search, #diagram-type-select"
      hx-swap="outerHTML"
      hx-target="#mermaid-output"
      hx-indicator="#spinner"
      hx-disabled-elt=".disable-during-update-req"
      data-content-type={escapeHtml(contentType)}
      data-entity-id={escapeHtml(entityId)}
      class="add-content-form"
    >
      <input type="hidden" name="contentType" value={escapeHtml(contentType)} />
      <input
        type="text"
        name="contentName"
        placeholder={`Enter ${contentType} name`}
        class="add-content-input disable-during-update-req"
        pattern="^[A-Za-z](?:[A-Za-z0-9_]*[A-Za-z0-9])?$"
        title="Must start with a letter, contain only letters, numbers, and underscores, and cannot end with an underscore"
        required
        autofocus
        hx-trigger="keyup[key=='Escape']"
        hx-get={`entity/${entityId}/toggleAddContent?contentType=${contentType}`}
        hx-vals="js:{isOpen: false}"
        hx-target={`#${formContainerId}`}
        hx-swap="innerHTML"
        hx-on--after-request={`document.getElementById('${btnId}').classList.remove('open')`}
        onblur={`if (event.relatedTarget && event.relatedTarget.id === '${btnId}') return; if(this.value.trim() === '') { document.getElementById('${btnId}').click() } else if(this.validity.valid) { htmx.trigger(this.form, 'submit') }`}
      />
    </form>
  )
}
