/// <reference types="@kitajs/html/htmx.d.ts" />

import { DtdlObjectModel, PropertyInfo } from '@digicatapult/dtdl-parser'
import { escapeHtml } from '@kitajs/html'
import { DTDL_PRIMITIVE_SCHEMA_OPTIONS, DTDL_VALID_WRITABLE_OPTIONS, DtdlId } from '../../models/strings.js'
import { MAX_DISPLAY_NAME_LENGTH, MAX_VALUE_LENGTH } from '../../utils/dtdl/entityUpdate.js'
import { getDisplayName, getSchemaDisplayName } from '../../utils/dtdl/extract.js'
import { EditableSelect, EditableText } from '../common.js'

export const PropertyDetails = ({
  property,
  name,
  model,
  edit,
  entityId,
}: {
  property: PropertyInfo
  name: string
  model: DtdlObjectModel
  edit: boolean
  entityId: DtdlId
}): JSX.Element => {
  if (!property.DefinedIn) return <></>

  const isExtended = property.DefinedIn !== entityId
  const canEdit = edit && !isExtended

  return (
    <div
      class={isExtended ? 'extended-detail' : undefined}
      title={isExtended ? `Extended from ${getDisplayName(model[property.DefinedIn])}` : undefined}
    >
      <b>Name: </b>
      {escapeHtml(property.name)}
      <br />
      <b>Display Name:</b>
      <EditableText
        edit={canEdit}
        definedIn={property.DefinedIn}
        putRoute="propertyDisplayName"
        text={property.displayName?.en}
        additionalBody={{ propertyName: name }}
        maxLength={MAX_DISPLAY_NAME_LENGTH}
      />
      <b>Schema:</b>
      <EditableSelect
        edit={canEdit}
        definedIn={property.DefinedIn}
        putRoute="propertySchema"
        text={getSchemaDisplayName(model[property.schema])}
        additionalBody={{ propertyName: name }}
        options={DTDL_PRIMITIVE_SCHEMA_OPTIONS}
      />
      <b>Description:</b>
      {EditableText({
        edit: canEdit,
        definedIn: property.DefinedIn,
        putRoute: 'propertyDescription',
        text: property.description?.en,
        additionalBody: { propertyName: name },
        multiline: true,
        maxLength: MAX_VALUE_LENGTH,
      })}
      <b>Comment:</b>
      {EditableText({
        edit: canEdit,
        definedIn: property.DefinedIn,
        putRoute: 'propertyComment',
        text: property.comment,
        additionalBody: { propertyName: name },
        multiline: true,
        maxLength: MAX_VALUE_LENGTH,
      })}
      <b>Writable:</b>
      <EditableSelect
        edit={canEdit}
        definedIn={property.DefinedIn}
        putRoute="propertyWritable"
        text={String(property.writable)}
        additionalBody={{ propertyName: name }}
        options={DTDL_VALID_WRITABLE_OPTIONS}
      />
      <br />
    </div>
  )
}
