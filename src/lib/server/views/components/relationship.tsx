/// <reference types="@kitajs/html/htmx.d.ts" />

import { DtdlObjectModel, RelationshipInfo } from '@digicatapult/dtdl-parser'
import { escapeHtml } from '@kitajs/html'
import { DtdlId } from '../../models/strings.js'
import { MAX_VALUE_LENGTH } from '../../utils/dtdl/entityUpdate.js'
import { getDisplayName } from '../../utils/dtdl/extract.js'
import { EditableSelect, EditableText } from '../common.js'

export const RelationshipDetails = ({
  relationship,
  name,
  model,
  edit,
  entityId,
  interfaceOptions,
}: {
  relationship: RelationshipInfo
  name: string
  model: DtdlObjectModel
  edit: boolean
  entityId: DtdlId
  interfaceOptions: Array<{ value: string; label: string }>
}): JSX.Element => {
  const definedIn = entityId
  const relationshipDefinedIn = relationship.DefinedIn ?? definedIn

  // Determine if this relationship is inherited or defined on the current interface
  const isInherited = relationship.DefinedIn !== definedIn

  // Get display name for the inherited interface
  const inheritedFromEntity = model[relationshipDefinedIn]
  const inheritedFromName = inheritedFromEntity ? getDisplayName(inheritedFromEntity) : relationshipDefinedIn

  // Get target display name - extract friendly name from DTDL ID if target doesn't exist in model
  const targetEntity = relationship.target ? model[relationship.target] : undefined
  const targetName = targetEntity
    ? getDisplayName(targetEntity)
    : relationship.target
      ? (relationship.target.split(':').pop()?.split(';')[0] ?? relationship.target)
      : 'Unknown'

  const tooltipText = isInherited ? escapeHtml(`Inherited from ${inheritedFromName}. Target: ${targetName}`) : undefined

  return (
    <div class={isInherited ? 'inherited-relationship' : ''} data-tooltip={tooltipText}>
      <p>
        <b>Display Name:</b>
      </p>
      <EditableText
        edit={edit && !isInherited}
        definedIn={relationshipDefinedIn}
        putRoute="relationshipDisplayName"
        text={relationship.displayName?.en}
        keyName="displayName"
        additionalBody={{ relationshipName: name }}
        maxLength={64}
      />
      <p>
        <b>Description:</b>
      </p>
      <EditableText
        edit={edit && !isInherited}
        definedIn={relationshipDefinedIn}
        putRoute="relationshipDescription"
        text={relationship.description?.en}
        keyName="description"
        additionalBody={{ relationshipName: name }}
        multiline={true}
        maxLength={MAX_VALUE_LENGTH}
      />
      <p>
        <b>Comment:</b>
      </p>
      <EditableText
        edit={edit && !isInherited}
        definedIn={relationshipDefinedIn}
        putRoute="relationshipComment"
        text={relationship.comment}
        keyName="comment"
        additionalBody={{ relationshipName: name }}
        multiline={true}
        maxLength={MAX_VALUE_LENGTH}
      />
      <p>
        <b>Target:</b>
      </p>
      {relationship.target ? (
        <EditableSelect
          edit={edit && !isInherited}
          definedIn={relationshipDefinedIn}
          putRoute="relationshipTarget"
          text={relationship.target}
          options={interfaceOptions}
          disabled={isInherited}
          additionalBody={!isInherited ? { relationshipName: name } : undefined}
        />
      ) : (
        <p>'target' key missing in original file</p>
      )}
      <br />
    </div>
  )
}
