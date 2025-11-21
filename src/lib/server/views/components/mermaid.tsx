/// <reference types="@kitajs/html/htmx.d.ts" />

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { escapeHtml } from '@kitajs/html'
import { randomUUID } from 'crypto'
import { container, singleton } from 'tsyringe'
import { Env } from '../../env/index.js'
import { DeletableEntities } from '../../models/controllerTypes.js'
import { DiagramType, diagramTypes } from '../../models/mermaidDiagrams.js'
import { DTDL_VALID_SCHEMAS, DtdlId, UUID } from '../../models/strings.js'
import { MAX_VALUE_LENGTH } from '../../utils/dtdl/entityUpdate.js'
import {
  getDisplayName,
  isCommand,
  isInterface,
  isProperty,
  isRelationship,
  isTelemetry,
} from '../../utils/dtdl/extract.js'
import { DtdlPath } from '../../utils/dtdl/parser.js'
import { AccordionSection, EditableSelect, EditableText, Page } from '../common.js'
import { PropertyDetails } from './property.js'
import { RelationshipDetails } from './relationship.js'

const env = container.resolve(Env)

const commonUpdateAttrs = {
  'hx-target': '#mermaid-output',
  'hx-get': 'update-layout',
  'hx-swap': 'outerHTML  transition:true',
  'hx-include': '#sessionId, #search-panel, input[name="navigationPanelTab"], #navigationPanelExpanded',
  'hx-indicator': '#spinner',
  'hx-disabled-elt': 'select',
}

function maybeNumberToAttr(value: number | undefined, defaultValue: number) {
  return `${value === undefined ? defaultValue : value}`
}

@singleton()
export default class MermaidTemplates {
  constructor() {}

  public MermaidRoot = ({
    search,
    sessionId,
    diagramType,
    svgWidth,
    svgHeight,
    canEdit,
  }: {
    search?: string
    sessionId: UUID
    diagramType: DiagramType
    svgWidth?: number
    svgHeight?: number
    canEdit: boolean
  }) => (
    <Page title={'UKDTC'}>
      <input id="sessionId" name="sessionId" type="hidden" value={escapeHtml(sessionId)} />
      <section id="toolbar">
        <this.searchPanel search={search} diagramType={diagramType} svgWidth={svgWidth} svgHeight={svgHeight} />
        <this.uploadForm />
        <this.shareOntology />
        <this.publishForm canPublish={false} />
      </section>

      <div id="mermaid-wrapper">
        <this.mermaidTarget target="mermaid-output" />
        <div id="spinner" class="spinner" />
      </div>
      <this.Legend showContent={false} />
      <this.navPanelPlaceholder expanded={false} edit={canEdit} />
      <this.svgControls svgRawHeight={svgHeight} svgRawWidth={svgWidth} />
      <this.editToggle canEdit={canEdit} />
      <this.deleteDialog />
    </Page>
  )

  public svgControls = ({
    generatedOutput,
    svgRawWidth,
    svgRawHeight,
    swapOutOfBand,
  }: {
    generatedOutput?: JSX.Element
    svgRawWidth?: number
    svgRawHeight?: number
    swapOutOfBand?: boolean
  }): JSX.Element => {
    const output = generatedOutput ?? ''
    return (
      <div id="svg-controls" hx-swap-oob={swapOutOfBand ? 'true' : undefined}>
        <div
          id="minimap"
          style={`
            --svg-raw-width: ${svgRawWidth || 300};
            --svg-raw-height: ${svgRawHeight || 100};
          `}
        >
          {output && <div id="minimap-svg">{output}</div>}
        </div>
        <div id="zoom-buttons">
          <button id="zoom-in">+</button>
          <button id="reset-pan-zoom">◯</button>
          <button id="zoom-out">-</button>
        </div>
      </div>
    )
  }

  public mermaidTarget = ({
    generatedOutput,
    target,
  }: {
    generatedOutput?: JSX.Element
    target: string
  }): JSX.Element => {
    const attributes = generatedOutput
      ? { 'hx-on::after-settle': `globalThis.setMermaidListeners()`, 'pending-listeners': '' }
      : {
          'hx-trigger': 'load',
          ...commonUpdateAttrs,
        }
    const output = generatedOutput ?? ''
    const content = target === 'mermaid-output' ? output : this.mermaidMessage(output, target)
    return (
      <div id="mermaid-output" class="mermaid" {...attributes}>
        {content}
      </div>
    )
  }

  private mermaidMessage = (message: JSX.Element, target: string): JSX.Element => {
    return (
      <div id="mermaid-output-message">
        <div class={target == 'mermaid-warning-message' ? 'warning-logo' : 'info-logo'} />
        <p>{escapeHtml(message)}</p>
      </div>
    )
  }

  public navPanelPlaceholder = ({ expanded, edit }: { expanded: boolean; edit: boolean }): JSX.Element => {
    return (
      <aside id="navigation-panel" {...(expanded && { 'aria-expanded': '' })} class={edit ? 'edit' : 'view'}>
        <button
          id="navigation-panel-button"
          onclick="globalThis.toggleNavPanel(event)"
          {...{ [expanded ? 'aria-expanded' : 'aria-hidden']: '' }}
        ></button>
        <div id="navigation-panel-content">
          return <section>Loading Ontology...</section>
        </div>
      </aside>
    )
  }

  public navigationPanel = ({
    swapOutOfBand,
    entityId,
    model,
    expanded,
    edit,
    tab,
    fileTree,
  }: {
    swapOutOfBand?: boolean
    entityId?: DtdlId
    model: DtdlObjectModel
    expanded: boolean
    edit: boolean
    tab: 'details' | 'tree'
    fileTree: DtdlPath[]
  }): JSX.Element => {
    return (
      <aside
        id="navigation-panel"
        hx-swap-oob={swapOutOfBand ? 'true' : undefined}
        {...{ [expanded ? 'aria-expanded' : 'aria-hidden']: '' }}
        class={edit ? 'edit' : 'view'}
      >
        <input
          id="navigationPanelExpanded"
          name="navigationPanelExpanded"
          type="hidden"
          value={expanded ? 'true' : 'false'}
        />
        <button id="navigation-panel-button" onclick="globalThis.toggleNavPanel(event)"></button>
        <div id="navigation-panel-controls">
          <label>
            <h2>Details</h2>
            <input type="radio" name="navigationPanelTab" value="details" checked={tab === 'details'} />
          </label>
          <label>
            <h2>Tree</h2>
            <input type="radio" name="navigationPanelTab" value="tree" checked={tab === 'tree'} />
          </label>
        </div>
        <div id="navigation-panel-content">
          <this.navigationPanelDetails entityId={entityId} model={model} edit={edit} />
          <this.navigationPanelTree entityId={entityId} fileTree={fileTree} />
        </div>
      </aside>
    )
  }

  navigationPanelDetails = ({
    entityId,
    model,
    edit,
  }: {
    entityId?: DtdlId
    model?: DtdlObjectModel
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
            keyName: 'displayName',
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
            keyName: 'description',
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
            text: entity.comment,
            keyName: 'comment',
            multiline: true,
            maxLength: MAX_VALUE_LENGTH,
          })}
          {showRelationshipTarget && (
            <>
              <p>
                <b>Target:</b>
              </p>
              {entity.target ? (
                (() => {
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
                })()
              ) : (
                <p>'target' key missing in original file</p>
              )}
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
        <AccordionSection heading={'Properties'} collapsed={false}>
          {isInterface(entity) && Object.keys(entity.properties).length > 0
            ? Object.entries(entity.properties).map(([name, id]) => {
                const property = model[id]
                if (!isProperty(property)) return
                return (
                  <PropertyDetails property={property} name={name} model={model} edit={edit} entityId={entity.Id} />
                )
              })
            : 'None'}
        </AccordionSection>
        <AccordionSection heading={'Relationships'} collapsed={false}>
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
        <AccordionSection heading={'Telemetries'} collapsed={false}>
          {isInterface(entity) && Object.keys(entity.telemetries).length > 0
            ? Object.entries(entity.telemetries).map(([name, id]) => {
                const telemetry = model[id]
                if (!isTelemetry(telemetry) || !telemetry.DefinedIn) return
                return (
                  <>
                    <b>Name: </b>
                    {escapeHtml(name)}
                    <br />
                    <b>Display Name:</b>
                    <EditableText
                      edit={edit}
                      definedIn={telemetry.DefinedIn}
                      putRoute="telemetryDisplayName"
                      text={telemetry.displayName?.en}
                      keyName="displayName"
                      additionalBody={{ telemetryName: name }}
                      maxLength={64}
                    />
                    <b>Schema:</b>
                    <EditableSelect
                      edit={edit}
                      definedIn={telemetry.DefinedIn}
                      putRoute="telemetrySchema"
                      text={model[telemetry.schema].displayName?.en ?? 'Complex schema'}
                      additionalBody={{ telemetryName: name }}
                      options={DTDL_VALID_SCHEMAS}
                    />
                    <b>Description:</b>
                    <EditableText
                      edit={edit}
                      definedIn={telemetry.DefinedIn}
                      putRoute="telemetryDescription"
                      text={telemetry.description?.en}
                      keyName="description"
                      additionalBody={{ telemetryName: name }}
                      multiline={true}
                      maxLength={MAX_VALUE_LENGTH}
                    />
                    <b>Comment:</b>
                    {EditableText({
                      edit,
                      definedIn: telemetry.DefinedIn,
                      putRoute: 'telemetryComment',
                      text: telemetry.comment,
                      keyName: 'comment',
                      additionalBody: { telemetryName: name },
                      multiline: true,
                      maxLength: MAX_VALUE_LENGTH,
                    })}
                    <br />
                  </>
                )
              })
            : 'None'}
        </AccordionSection>
        <AccordionSection heading={'Commands'} collapsed={false}>
          {isInterface(entity) && Object.keys(entity.commands).length > 0
            ? Object.entries(entity.commands).map(([name, id]) => {
                const command = model[id]
                if (!isCommand(command) || !command.DefinedIn) return
                let requestEntity, responseEntity
                const requestId = command.request
                if (requestId) {
                  requestEntity = model[requestId]
                }
                const responseId = command.response
                if (responseId) {
                  responseEntity = model[responseId]
                }
                return (
                  <>
                    <b>Display Name:</b>
                    {EditableText({
                      edit,
                      definedIn: command.DefinedIn,
                      putRoute: 'commandDisplayName',
                      text: command.displayName.en,
                      additionalBody: { commandName: name },
                      maxLength: 64,
                      keyName: 'displayName',
                    })}

                    <b>Description:</b>
                    {EditableText({
                      edit,
                      definedIn: command.DefinedIn,
                      putRoute: 'commandDescription',
                      text: command.description.en,
                      additionalBody: { commandName: name },
                      multiline: true,
                      maxLength: MAX_VALUE_LENGTH,
                      keyName: 'description',
                    })}
                    <b>Comment:</b>
                    {EditableText({
                      edit,
                      definedIn: command.DefinedIn,
                      putRoute: 'commandComment',
                      text: command.comment,
                      additionalBody: { commandName: name },
                      multiline: true,
                      maxLength: MAX_VALUE_LENGTH,
                      keyName: 'comment',
                    })}
                    <AccordionSection heading={'Request'} collapsed={false}>
                      <b>Request displayName:</b>
                      {EditableText({
                        edit,
                        definedIn: command.DefinedIn,
                        putRoute: 'commandRequestDisplayName',
                        text: requestEntity?.displayName?.en ?? '',
                        additionalBody: { commandName: name },
                        multiline: true,
                        maxLength: MAX_VALUE_LENGTH,
                        keyName: 'requestDisplayName',
                      })}
                      <b>Request comment:</b>
                      {EditableText({
                        edit,
                        definedIn: command.DefinedIn,
                        putRoute: 'commandRequestComment',
                        text: requestEntity?.comment ?? '',
                        additionalBody: { commandName: name },
                        multiline: true,
                        maxLength: MAX_VALUE_LENGTH,
                        keyName: 'requestComment',
                      })}
                      <b>Request description:</b>
                      {EditableText({
                        edit,
                        definedIn: command.DefinedIn,
                        putRoute: 'commandRequestDescription',
                        text: requestEntity?.description?.en ?? '',
                        additionalBody: { commandName: name },
                        multiline: true,
                        maxLength: MAX_VALUE_LENGTH,
                        keyName: 'requestDescription',
                      })}
                      <b>Schema:</b>
                      <EditableSelect
                        edit={edit}
                        definedIn={command.DefinedIn}
                        putRoute="commandRequestSchema"
                        text={
                          requestEntity?.schema
                            ? (model[requestEntity.schema].displayName?.en ?? 'Complex schema')
                            : 'schema key missing in original file'
                        }
                        additionalBody={{ commandName: name }}
                        options={DTDL_VALID_SCHEMAS}
                      />
                    </AccordionSection>
                    <AccordionSection heading={'Response'} collapsed={false}>
                      <b>Response displayName:</b>
                      {EditableText({
                        edit,
                        definedIn: command.DefinedIn,
                        putRoute: 'commandResponseDisplayName',
                        text: responseEntity?.displayName?.en ?? '',
                        additionalBody: { commandName: name },
                        multiline: true,
                        maxLength: MAX_VALUE_LENGTH,
                        keyName: 'responseDisplayName',
                      })}
                      <b>Response comment:</b>
                      {EditableText({
                        edit,
                        definedIn: command.DefinedIn,
                        putRoute: 'commandResponseComment',
                        text: responseEntity?.comment ?? '',
                        additionalBody: { commandName: name },
                        multiline: true,
                        maxLength: MAX_VALUE_LENGTH,
                        keyName: 'responseComment',
                      })}
                      <b>Response description:</b>
                      {EditableText({
                        edit,
                        definedIn: command.DefinedIn,
                        putRoute: 'commandResponseDescription',
                        text: responseEntity?.description?.en ?? '',
                        additionalBody: { commandName: name },
                        multiline: true,
                        maxLength: MAX_VALUE_LENGTH,
                        keyName: 'responseDescription',
                      })}
                      <b>Schema:</b>
                      <EditableSelect
                        edit={edit}
                        definedIn={command.DefinedIn}
                        putRoute="commandResponseSchema"
                        text={
                          responseEntity?.schema
                            ? (model[responseEntity.schema].displayName?.en ?? 'Complex schema')
                            : 'schema key missing in original file'
                        }
                        additionalBody={{ commandName: name }}
                        options={DTDL_VALID_SCHEMAS}
                      />
                    </AccordionSection>
                    <br />
                  </>
                )
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

  navigationPanelTree = ({ entityId, fileTree }: { entityId?: DtdlId; fileTree: DtdlPath[] }): JSX.Element => {
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

    const defaultExpandSet = fileTree.reduce(reducer, null) || new Set<DtdlPath>()

    // Helper function to check if a single path has errors
    const hasErrors = (path: DtdlPath): boolean => {
      return path.type === 'file' && path.errors !== undefined
    }

    // Helper function to check if a path or its children contain errors
    const hasChildErrors = (path: DtdlPath): boolean => {
      if (hasErrors(path)) {
        return true
      }
      if (path.type === 'directory' || path.type === 'file' || path.type === 'fileEntry') {
        return path.entries.some(hasChildErrors)
      }
      return false
    }

    const containsErrors = (paths: DtdlPath[]): boolean =>
      paths.some((path) =>
        path.type === 'file'
          ? path.errors !== undefined // found a file with errors
          : path.type === 'directory'
            ? containsErrors(path.entries)
            : false
      )

    return (
      <div id="navigation-panel-tree">
        <div>
          <this.navigationPanelTreeLevel
            highlightedEntityId={entityId}
            highlightedEntitySet={defaultExpandSet}
            fileTree={fileTree}
            hasErrors={hasErrors}
            hasChildErrors={hasChildErrors}
          />
        </div>
        {containsErrors(fileTree) && (
          <div id="navigation-panel-tree-warning">
            <img src="/public/images/warning.svg" width="54px" height="50px" />
            <p>Only a part of this ontology could be loaded, due to errors.</p>
          </div>
        )}
      </div>
    )
  }

  navigationPanelTreeLevel = ({
    highlightedEntityId,
    highlightedEntitySet,
    fileTree,
    hasErrors,
    hasChildErrors,
  }: {
    highlightedEntityId?: DtdlId
    highlightedEntitySet: Set<DtdlPath>
    fileTree: DtdlPath[]
    hasErrors: (path: DtdlPath) => boolean
    hasChildErrors: (path: DtdlPath) => boolean
  }): JSX.Element => {
    return (
      <>
        {fileTree.map((path) => {
          const isHighlighted = 'id' in path ? path.id === highlightedEntityId : false
          const highlightClass = isHighlighted ? 'nav-tree-leaf-highlighted' : ''

          // Determine error classes - files get red, directories with child errors get black with warning
          const pathHasErrors = hasErrors(path)
          const pathHasChildErrors = !pathHasErrors && hasChildErrors(path)
          const errorClass = pathHasErrors ? 'nav-tree-error' : pathHasChildErrors ? 'nav-tree-has-child-errors' : ''

          if (path.type === 'fileEntryContent' || path.entries.length === 0) {
            // Check if this is a file with errors that needs an accordion
            if (pathHasErrors && path.type === 'file') {
              const errors = path.errors || []
              // Error accordions should use the same expansion logic as regular directories
              const isExpanded = highlightedEntitySet.has(path)
              return (
                <div class="accordion-parent">
                  <button
                    class={`navigation-panel-tree-leaf tree-icon ${this.navigationPanelNodeClass(path)} ${highlightClass} ${errorClass}`.trim()}
                    {...{ [isExpanded ? 'aria-expanded' : 'aria-hidden']: '' }}
                    onclick="globalThis.toggleAccordion(event)"
                  >
                    {escapeHtml(path.name)}
                    <img src="/public/images/warning.svg" class="warning-icon" />
                  </button>
                  <div class="accordion-content" {...{ [isExpanded ? 'aria-expanded' : 'aria-hidden']: '' }}>
                    <div class="error-details">
                      {errors.map((error) => {
                        const isResolutionError = error.ExceptionKind === 'Resolution'
                        const isParsingError = error.ExceptionKind === 'Parsing'
                        const hasUndefinedIdentifiers = !!(isResolutionError && error.UndefinedIdentifiers)
                        const hasParsingErrors = !!(isParsingError && error.Errors)

                        return (
                          <div class="error-item">
                            <div class="error-kind">
                              <strong>{error.ExceptionKind} Error</strong>
                            </div>
                            {hasUndefinedIdentifiers && (
                              <div class="error-message">
                                Undefined identifiers: {escapeHtml(error.UndefinedIdentifiers!.join(', '))}
                              </div>
                            )}
                            {hasParsingErrors && (
                              <div class="error-message">
                                {error.Errors!.map((parseError) => (
                                  <div>
                                    <strong>Cause:</strong> {escapeHtml(parseError.Cause)}
                                    <br />
                                    <strong>Action:</strong> {escapeHtml(parseError.Action)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div
                class={`navigation-panel-tree-leaf tree-icon ${this.navigationPanelNodeClass(path)} ${highlightClass} ${errorClass}`.trim()}
              >
                {escapeHtml(path.name)}
                {pathHasErrors && <img src="/public/images/warning.svg" class="warning-icon" />}
              </div>
            )
          }

          const isExpanded = highlightedEntitySet.has(path)
          return (
            <div class="accordion-parent">
              <button
                class={`navigation-panel-tree-node tree-icon ${this.navigationPanelNodeClass(path)} ${highlightClass} ${errorClass}`.trim()}
                {...{ [isExpanded ? 'aria-expanded' : 'aria-hidden']: '' }}
                onclick="globalThis.toggleAccordion(event)"
              >
                {escapeHtml(path.name)}
                {(pathHasErrors || pathHasChildErrors) && <img src="/public/images/warning.svg" class="warning-icon" />}
              </button>
              <div class="accordion-content" {...{ [isExpanded ? 'aria-expanded' : 'aria-hidden']: '' }}>
                <div>
                  <this.navigationPanelTreeLevel
                    highlightedEntityId={highlightedEntityId}
                    highlightedEntitySet={highlightedEntitySet}
                    fileTree={path.entries}
                    hasErrors={hasErrors}
                    hasChildErrors={hasChildErrors}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </>
    )
  }

  navigationPanelNodeClass = (
    path: DtdlPath
  ): 'directory' | 'file' | 'interface' | 'relationship' | 'property' | 'telemetry' | 'command' => {
    if (path.type === 'directory' || path.type === 'file') {
      return path.type
    }
    switch (path.dtdlType) {
      case 'Interface':
        return 'interface'
      case 'Relationship':
        return 'relationship'
      case 'Property':
        return 'property'
      case 'Telemetry':
        return 'telemetry'
      case 'Command':
        return 'command'
      default:
        return 'property'
    }
  }

  public searchPanel = ({
    search,
    swapOutOfBand,
    diagramType,
    svgWidth,
    svgHeight,
    currentZoom,
    currentPanX,
    currentPanY,
  }: {
    // inputs with current state
    search?: string
    diagramType: DiagramType
    // hidden inputs not set by input controls
    svgWidth?: number
    svgHeight?: number
    currentZoom?: number
    currentPanX?: number
    currentPanY?: number
    // is this swap being done out of band?
    swapOutOfBand?: boolean
  }) => {
    return (
      <form
        id="search-panel"
        name={`search-panel-${randomUUID()}`} // avoid a firefox annoyance where it reverts the form state on refresh by making each form distinct
        class="button-group"
        hx-swap-oob={swapOutOfBand ? 'true' : undefined}
        hx-sync="this:replace"
        {...commonUpdateAttrs}
      >
        <h2>
          <a href="/">UKDTC</a>
        </h2>
        <input
          id="search"
          name="search"
          type="search"
          value={escapeHtml(search || '')}
          placeholder="Search"
          hx-trigger="input changed delay:500ms, search"
          {...commonUpdateAttrs}
        />

        <input id="svgWidth" name="svgWidth" type="hidden" value={maybeNumberToAttr(svgWidth, 300)} />
        <input id="svgHeight" name="svgHeight" type="hidden" value={maybeNumberToAttr(svgHeight, 100)} />
        <input id="currentZoom" name="currentZoom" type="hidden" value={maybeNumberToAttr(currentZoom, 1)} />
        <input id="currentPanX" name="currentPanX" type="hidden" value={maybeNumberToAttr(currentPanX, 0)} />
        <input id="currentPanY" name="currentPanY" type="hidden" value={maybeNumberToAttr(currentPanY, 0)} />

        <select id="diagram-type-select" name="diagramType" hx-trigger="input changed" {...commonUpdateAttrs}>
          {diagramTypes.map((entry) => (
            <option value={entry} selected={entry === diagramType}>
              {escapeHtml(entry)}
            </option>
          ))}
        </select>
      </form>
    )
  }

  public deleteDialog = ({
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
  }) => {
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

  public Legend = ({ showContent }: { showContent: boolean }) => {
    return (
      <section id="legend">
        <div id="legend-content" class={showContent ? 'show-content' : ''}>
          <this.LegendItem
            iconClass="active"
            title="Currently Active (Clicked) Node"
            description="Indicates the currently active selection."
          />
          <this.LegendItem
            iconClass="search"
            title="Search Result Node"
            description="Nodes matching the current search criteria."
          />
          <this.LegendItem
            iconClass="expanded"
            title="Expanded Node"
            description="Node is expanded, connections visible."
          />
          <this.LegendItem
            iconClass="unexpanded"
            title="Unexpanded Node"
            description="Node is unexpanded, no connections shown."
          />
        </div>
        <button
          hx-swap="outerHTML"
          hx-target="#legend"
          hx-get={`/legend?showContent=${!showContent}`}
          class={showContent ? 'show-content' : ''}
        >
          Legend
        </button>
      </section>
    )
  }

  private LegendItem = ({
    iconClass,
    title,
    description,
  }: {
    iconClass: string
    title: string
    description: string
  }) => {
    return (
      <div class="legend-item">
        <div class={`legend-icon ${iconClass}`}></div>
        <div>
          <b safe>{title}</b>
          <p safe>{description}</p>
        </div>
      </div>
    )
  }

  private uploadForm = () => {
    return (
      <a id="open-button" href={`/open`} class="rounded-button">
        Open
      </a>
    )
  }

  private shareOntology = () => {
    // htmx component to generate a shareable link for the ontology
    return (
      <>
        <a id="share-ontology" onclick="globalThis.showShareModal()" class="rounded-button">
          Share
        </a>
        <dialog id="share-link-modal" class="modal">
          <form method="dialog">
            <h3>Shareable Link</h3>

            <label>
              <input type="radio" name="link-type" value="short" checked onchange="globalThis.updateShareLink()" />
              <span>Entire ontology</span>
            </label>
            <label>
              <input type="radio" name="link-type" value="full" onchange="globalThis.updateShareLink()" />
              <span>Current search selection of ontology</span>
            </label>

            <input id="link-output" type="text" readonly value="" placeholder="Generated link here" />
            <p style="font-size: 0.9rem; color: #555;">
              🔒 Access to this ontology depends on your GitHub permissions. Ensure recipients have the necessary access
              before sharing.
            </p>
            <div id="copy-button-wrapper">
              <span id="copy-tooltip" class="tooltip">
                Copy url to clipboard
              </span>
              <button id="copy-link-button" type="button" onclick="globalThis.copyShareLink()">
                Copy URL
                <span id="copy-icon" />
              </button>
            </div>
            <button class="modal-button" />
          </form>
        </dialog>
      </>
    )
  }

  private publishForm = ({ canPublish }: { canPublish: boolean }) => {
    if (!env.get('EDIT_ONTOLOGY')) return <></>
    return (
      <a
        id="publish-ontology"
        href={`${!canPublish ? 'javascript:void(0)' : '/publish'}`}
        class={`button ${!canPublish ? 'disabled' : ''}`}
        title={
          canPublish
            ? 'Click to publish ontology'
            : 'Only Ontologies from github that you have write permissions on, can be published'
        }
      >
        Publish
      </a>
    )
  }

  public editToggle = ({ canEdit }: { canEdit: boolean }) => {
    if (!env.get('EDIT_ONTOLOGY')) return <></>
    return (
      <div id="edit-controls">
        <div
          id="edit-toggle"
          title={
            canEdit
              ? 'Click to edit ontology'
              : 'Only Ontologies from github that you have write permissions on, can be edited'
          }
          class={canEdit ? '' : 'disabled'}
        >
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
          <button id="add-node-button"></button>
        </div>
      </div>
    )
  }
}
