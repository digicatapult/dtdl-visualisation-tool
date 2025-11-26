/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { DtdlId } from '../../models/strings.js'

export const AddContentButton = ({
  contentType,
  entityId,
}: {
  contentType: 'Property' | 'Relationship' | 'Telemetry' | 'Command'
  entityId: DtdlId
}): JSX.Element => {
  const targetId = `add-${contentType.toLowerCase()}-form`
  return (
    <button
      class="add-content-button"
      hx-get={`entity/${entityId}/addContentForm?contentType=${contentType}`}
      hx-target={`#${targetId}`}
      hx-swap="outerHTML"
      title={`Add new ${contentType}`}
    >
      +
    </button>
  )
}

export const AddContentForm = ({
  contentType,
  entityId,
}: {
  contentType: 'Property' | 'Relationship' | 'Telemetry' | 'Command'
  entityId: DtdlId
}): JSX.Element => {
  const targetId = `add-${contentType.toLowerCase()}-form`
  return (
    <div id={targetId} class="add-content-form">
      <form
        hx-post={`entity/${entityId}/content`}
        hx-ext="json-enc"
        hx-include="#sessionId, #svgWidth, #svgHeight, #currentZoom, #currentPanX, #currentPanY, #search, #diagram-type-select"
        hx-swap="outerHTML transition:true"
        hx-target="#mermaid-output"
        hx-indicator="#spinner"
      >
        <input type="hidden" name="contentType" value={escapeHtml(contentType)} />
        <input
          type="text"
          name="contentName"
          placeholder={`Enter ${contentType} name`}
          class="add-content-input"
          pattern="^[A-Za-z](?:[A-Za-z0-9_]*[A-Za-z0-9])?$"
          title="Must start with a letter, contain only letters, numbers, and underscores, and cannot end with an underscore"
          required
          autofocus
        />
        <button type="submit" class="add-content-submit" title="Add">
          ✓
        </button>
        <button
          type="button"
          class="add-content-cancel"
          title="Cancel"
          hx-get={`entity/${entityId}/addContentButton?contentType=${contentType}`}
          hx-target={`#${targetId}`}
          hx-swap="outerHTML"
        >
          ✕
        </button>
      </form>
    </div>
  )
}

export const AddContentFormPlaceholder = ({
  contentType,
}: {
  contentType: 'Property' | 'Relationship' | 'Telemetry' | 'Command'
}): JSX.Element => {
  const targetId = `add-${contentType.toLowerCase()}-form`
  return <div id={targetId} class="add-content-form-placeholder"></div>
}
