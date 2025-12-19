/// <reference types="@kitajs/html/htmx.d.ts" />

import { CommandInfo, DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { escapeHtml } from '@kitajs/html'
import { DTDL_PRIMITIVE_SCHEMA_OPTIONS, DtdlId } from '../../models/strings.js'
import { MAX_VALUE_LENGTH } from '../../utils/dtdl/entityUpdate.js'
import { getSchemaDisplayName, isCommandRequest, isCommandResponse } from '../../utils/dtdl/extract.js'
import { AccordionSection, EditableSelect, EditableText } from '../common.js'

export const CommandDetails = ({
  command,
  name,
  model,
  edit,
  entityId,
}: {
  command: CommandInfo
  name: string
  model: DtdlObjectModel
  edit: boolean
  entityId: DtdlId
}): JSX.Element => {
  if (!command.DefinedIn) return <></>

  const isExtended = command.DefinedIn !== entityId
  const canEdit = edit && !isExtended

  const requestId = command.request
  const requestEntity = requestId && isCommandRequest(model[requestId]) ? model[requestId] : undefined

  const responseId = command.response
  const responseEntity = responseId && isCommandResponse(model[responseId]) ? model[responseId] : undefined

  return (
    <div
      class={isExtended ? 'extended-detail' : undefined}
      title={isExtended ? `Extended from ${model[command.DefinedIn]?.displayName?.en || command.DefinedIn}` : undefined}
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
          title="Delete Command"
        />
      )}
      <br />
      <b>Display Name:</b>
      {EditableText({
        edit: canEdit,
        definedIn: command.DefinedIn,
        putRoute: 'commandDisplayName',
        text: command.displayName.en,
        additionalBody: { commandName: name },
        maxLength: 64,
      })}

      <b>Description:</b>
      {EditableText({
        edit: canEdit,
        definedIn: command.DefinedIn,
        putRoute: 'commandDescription',
        text: command.description.en,
        additionalBody: { commandName: name },
        multiline: true,
        maxLength: MAX_VALUE_LENGTH,
      })}
      <b>Comment:</b>
      {EditableText({
        edit: canEdit,
        definedIn: command.DefinedIn,
        putRoute: 'commandComment',
        text: command.comment,
        additionalBody: { commandName: name },
        multiline: true,
        maxLength: MAX_VALUE_LENGTH,
      })}
      <AccordionSection heading={'Request'} collapsed={false}>
        <b>Name: </b>
        {escapeHtml(requestEntity?.name ?? '')}
        <br />
        <b>Request Display Name:</b>
        {EditableText({
          edit: canEdit,
          definedIn: command.DefinedIn,
          putRoute: 'commandRequestDisplayName',
          text: requestEntity?.displayName?.en ?? '',
          additionalBody: { commandName: name },
          multiline: true,
          maxLength: MAX_VALUE_LENGTH,
        })}
        <b>Request comment:</b>
        {EditableText({
          edit: canEdit,
          definedIn: command.DefinedIn,
          putRoute: 'commandRequestComment',
          text: requestEntity?.comment ?? '',
          additionalBody: { commandName: name },
          multiline: true,
          maxLength: MAX_VALUE_LENGTH,
        })}
        <b>Request description:</b>
        {EditableText({
          edit: canEdit,
          definedIn: command.DefinedIn,
          putRoute: 'commandRequestDescription',
          text: requestEntity?.description?.en ?? '',
          additionalBody: { commandName: name },
          multiline: true,
          maxLength: MAX_VALUE_LENGTH,
        })}
        <b>Schema:</b>
        <EditableSelect
          edit={canEdit}
          definedIn={command.DefinedIn}
          putRoute="commandRequestSchema"
          text={requestEntity?.schema ? getSchemaDisplayName(model[requestEntity.schema]) : undefined}
          additionalBody={{ commandName: name }}
          options={DTDL_PRIMITIVE_SCHEMA_OPTIONS}
        />
      </AccordionSection>
      <AccordionSection heading={'Response'} collapsed={false}>
        <b>Name: </b>
        {escapeHtml(responseEntity?.name ?? '')}
        <br />
        <b>Response Display Name:</b>
        {EditableText({
          edit: canEdit,
          definedIn: command.DefinedIn,
          putRoute: 'commandResponseDisplayName',
          text: responseEntity?.displayName?.en ?? '',
          additionalBody: { commandName: name },
          multiline: true,
          maxLength: MAX_VALUE_LENGTH,
        })}
        <b>Response comment:</b>
        {EditableText({
          edit: canEdit,
          definedIn: command.DefinedIn,
          putRoute: 'commandResponseComment',
          text: responseEntity?.comment ?? '',
          additionalBody: { commandName: name },
          multiline: true,
          maxLength: MAX_VALUE_LENGTH,
        })}
        <b>Response description:</b>
        {EditableText({
          edit: canEdit,
          definedIn: command.DefinedIn,
          putRoute: 'commandResponseDescription',
          text: responseEntity?.description?.en ?? '',
          additionalBody: { commandName: name },
          multiline: true,
          maxLength: MAX_VALUE_LENGTH,
        })}
        <b>Schema:</b>
        <EditableSelect
          edit={canEdit}
          definedIn={command.DefinedIn}
          putRoute="commandResponseSchema"
          text={responseEntity?.schema ? getSchemaDisplayName(model[responseEntity.schema]) : undefined}
          additionalBody={{ commandName: name }}
          options={DTDL_PRIMITIVE_SCHEMA_OPTIONS}
        />
      </AccordionSection>

      <br />
    </div>
  )
}
