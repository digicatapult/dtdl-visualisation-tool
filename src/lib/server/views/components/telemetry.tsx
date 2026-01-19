/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import type { DtdlModel, TelemetryEntity } from '../../models/dtdlOmParser.js'
import { DTDL_PRIMITIVE_SCHEMA_OPTIONS } from '../../models/strings.js'
import { MAX_DISPLAY_NAME_LENGTH, MAX_VALUE_LENGTH } from '../../utils/dtdl/entityUpdate.js'
import { getCommentText, getDisplayName, getSchemaDisplayName } from '../../utils/dtdl/extract.js'
import { EditableSelect, EditableText } from '../common.js'

export const TelemetryDetails = ({
  telemetry,
  name,
  model,
  edit,
  entityId,
}: {
  telemetry: TelemetryEntity
  name: string
  model: DtdlModel
  edit: boolean
  entityId: string
}): JSX.Element => {
  const definedIn = telemetry.DefinedIn ?? entityId

  const isExtended = definedIn !== entityId
  const canEdit = edit && !isExtended

  return (
    <div
      class={isExtended ? 'extended-detail' : undefined}
      title={isExtended ? `Extended from ${getDisplayName(model[definedIn])}` : undefined}
    >
      <b>Name: </b>
      {escapeHtml(name)}
      {edit && (
        <img
          src="/public/images/bin.svg"
          class="trash-icon"
          hx-get={`entity/${entityId}/deleteDialog?contentName=${name}`}
          hx-target="#delete-dialog"
          hx-swap="outerHTML"
          hx-on--after-request="globalThis.showDeleteDialog()"
          title="Delete Telemetry"
        />
      )}
      <br />
      <b>Display Name:</b>
      <EditableText
        edit={canEdit}
        definedIn={definedIn}
        putRoute="telemetryDisplayName"
        text={telemetry.displayName?.en}
        additionalBody={{ telemetryName: name }}
        maxLength={MAX_DISPLAY_NAME_LENGTH}
      />
      <b>Schema:</b>
      <EditableSelect
        edit={canEdit}
        definedIn={definedIn}
        putRoute="telemetrySchema"
        text={telemetry.schema ? getSchemaDisplayName(model[telemetry.schema]) : ''}
        additionalBody={{ telemetryName: name }}
        options={DTDL_PRIMITIVE_SCHEMA_OPTIONS}
      />
      <b>Description:</b>
      <EditableText
        edit={canEdit}
        definedIn={definedIn}
        putRoute="telemetryDescription"
        text={telemetry.description?.en}
        additionalBody={{ telemetryName: name }}
        multiline={true}
        maxLength={MAX_VALUE_LENGTH}
      />
      <b>Comment:</b>
      {EditableText({
        edit: canEdit,
        definedIn,
        putRoute: 'telemetryComment',
        text: getCommentText(telemetry.comment),
        additionalBody: { telemetryName: name },
        multiline: true,
        maxLength: MAX_VALUE_LENGTH,
      })}
      <br />
    </div>
  )
}
