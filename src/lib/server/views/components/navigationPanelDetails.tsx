/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { DtdlModel } from '../../models/dtdlOmParser.js'
import { DtdlId } from '../../models/strings.js'
import { MAX_VALUE_LENGTH } from '../../utils/dtdl/entityUpdate.js'
import {
  getCommentText,
  getDisplayName,
  isCommand,
  isInterface,
  isProperty,
  isRelationship,
  isTelemetry,
} from '../../utils/dtdl/extract.js'
import { AccordionSection, EditableSelect, EditableText } from '../common.js'
import { AddContentButton } from './addContent.js'
import { CommandDetails } from './command.js'
import { PropertyDetails } from './property.js'
import { RelationshipDetails } from './relationship.js'
import { TelemetryDetails } from './telemetry.js'

export const NavigationPanelDetails = ({
  entityId,
  model,
  edit,
}: {
  entityId?: DtdlId
  model?: DtdlModel
  edit: boolean
}): JSX.Element => {
  const entity = entityId && model ? model[entityId] : undefined

  if (!entityId || !entity || !model) {
    return (
      <div id="navigation-panel-details">
        <section>Click on a node to view attributes</section>
      </div>
    )
  }
  const definedIn = entity.DefinedIn ?? entityId // entities only have definedIn if defined in a different file

  // Build interface options list once for all relationships (if entity is an interface)
  const interfaceOptions = isInterface(entity)
    ? Object.values(model)
        .filter(isInterface)
        .map((iface) => ({
          value: iface.Id,
          label: `${getDisplayName(iface)} (${iface.Id})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : []
  const isRship = isRelationship(entity)
  const relationshipName = isRship ? entity.name : undefined
  const showRelationshipTarget = isRship && !!relationshipName
  return (
    <div id="navigation-panel-details">
      <section>
        <h3>Basic Information</h3>
        <p>
          <b>Display Name:</b>
        </p>
        {EditableText({
          edit,
          definedIn,
          putRoute: isRship ? 'relationshipDisplayName' : 'displayName',
          additionalBody: {
            ...(relationshipName ? { relationshipName } : {}),
          },
          text: entity?.displayName?.en,
          maxLength: 64,
        })}
        <p>
          <b>Description:</b>
        </p>
        {EditableText({
          edit,
          definedIn,
          putRoute: isRship ? 'relationshipDescription' : 'description',
          additionalBody: {
            ...(relationshipName ? { relationshipName } : {}),
          },
          text: entity.description?.en,
          multiline: true,
          maxLength: MAX_VALUE_LENGTH,
        })}
        <p>
          <b>Comment:</b>
        </p>
        {EditableText({
          edit,
          definedIn,
          putRoute: isRship ? 'relationshipComment' : 'comment',
          additionalBody: {
            ...(relationshipName ? { relationshipName } : {}),
          },
          text: getCommentText(entity.comment),
          multiline: true,
          maxLength: MAX_VALUE_LENGTH,
        })}
        {showRelationshipTarget && (
          <>
            <p>
              <b>Target:</b>
            </p>
            {(() => {
              // Build options list for all interfaces in the model
              const interfaceOptions = Object.values(model)
                .filter(isInterface)
                .map((iface) => ({
                  value: iface.Id,
                  label: `${getDisplayName(iface)} (${iface.Id})`,
                }))
                .sort((a, b) => a.label.localeCompare(b.label))

              return (
                <EditableSelect
                  edit={edit}
                  definedIn={definedIn}
                  putRoute="relationshipTarget"
                  text={entity.target}
                  options={interfaceOptions}
                  additionalBody={{ relationshipName }}
                />
              )
            })()}
          </>
        )}
      </section>
      <AccordionSection heading={'Entity Identifiers'} collapsed={false}>
        <p>
          <b>ID: </b>
          {escapeHtml(entity.Id)}
        </p>
        <p>
          <b>Entity Kind: </b>
          {entity.EntityKind}
        </p>
        <p>
          <b>Extends: </b>
          {isInterface(entity) && entity.extends.length > 0
            ? entity.extends.map((entityId) => getDisplayName(model[entityId]))
            : 'None'}
        </p>
      </AccordionSection>
      <AccordionSection
        heading={'Properties'}
        collapsed={false}
        Action={
          edit && isInterface(entity)
            ? () => <AddContentButton contentType="Property" entityId={entity.Id} />
            : undefined
        }
      >
        {isInterface(entity) && Object.keys(entity.properties).length > 0
          ? Object.entries(entity.properties).map(([name, id]) => {
              const property = model[id]
              if (!isProperty(property)) return
              return <PropertyDetails property={property} name={name} model={model} edit={edit} entityId={entity.Id} />
            })
          : 'None'}
      </AccordionSection>
      <AccordionSection
        heading={'Relationships'}
        collapsed={false}
        Action={
          edit && isInterface(entity)
            ? () => <AddContentButton contentType="Relationship" entityId={entity.Id} />
            : undefined
        }
      >
        {isInterface(entity) && Object.keys(entity.relationships).length > 0
          ? Object.entries(entity.relationships).map(([name, id]) => {
              const relationship = model[id]
              if (!isRelationship(relationship)) return null
              return (
                <RelationshipDetails
                  relationship={relationship}
                  name={name}
                  model={model}
                  edit={edit}
                  entityId={entity.Id}
                  interfaceOptions={interfaceOptions}
                />
              )
            })
          : 'None'}
      </AccordionSection>
      <AccordionSection
        heading={'Telemetries'}
        collapsed={false}
        Action={
          edit && isInterface(entity)
            ? () => <AddContentButton contentType="Telemetry" entityId={entity.Id} />
            : undefined
        }
      >
        {isInterface(entity) && Object.keys(entity.telemetries).length > 0
          ? Object.entries(entity.telemetries).map(([name, id]) => {
              const telemetry = model[id]
              if (!isTelemetry(telemetry)) return
              return (
                <TelemetryDetails telemetry={telemetry} name={name} model={model} edit={edit} entityId={entity.Id} />
              )
            })
          : 'None'}
      </AccordionSection>
      <AccordionSection
        heading={'Commands'}
        collapsed={false}
        Action={
          edit && isInterface(entity)
            ? () => <AddContentButton contentType="Command" entityId={entity.Id} />
            : undefined
        }
      >
        {isInterface(entity) && Object.keys(entity.commands).length > 0
          ? Object.entries(entity.commands).map(([name, id]) => {
              const command = model[id]
              if (!isCommand(command)) return
              return <CommandDetails command={command} name={name} model={model} edit={edit} entityId={entity.Id} />
            })
          : 'None'}
      </AccordionSection>

      <AccordionSection heading={'See Full JSON'} collapsed={true}>
        <pre>
          <code>{escapeHtml(JSON.stringify(entity, null, 4))}</code>
        </pre>
      </AccordionSection>
      {edit && (
        <section id="navigation-panel-actions">
          <a
            id="delete-dialog-button"
            hx-get={`entity/${entityId}/deleteDialog`}
            hx-swap="outerHTML"
            hx-target="#delete-dialog"
            class="rounded-button"
            hx-on--after-request="globalThis.showDeleteDialog()"
          >
            Delete {entity.EntityKind}
          </a>
        </section>
      )}
    </div>
  )
}
