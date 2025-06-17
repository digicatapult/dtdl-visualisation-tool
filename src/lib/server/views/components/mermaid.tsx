/// <reference types="@kitajs/html/htmx.d.ts" />

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { escapeHtml } from '@kitajs/html'
import { randomUUID } from 'crypto'
import { container, singleton } from 'tsyringe'
import { Env } from '../../env/index.js'
import { DiagramType, diagramTypes } from '../../models/mermaidDiagrams.js'
import { DtdlId, UUID } from '../../models/strings.js'
import { getDisplayNameOrId, isInterface, isProperty, isRelationship } from '../../utils/dtdl/extract.js'
import { DtdlPath } from '../../utils/dtdl/parser.js'
import { AccordionSection, EditableText, Page } from '../common.js'

const env = container.resolve(Env)

const commonUpdateAttrs = {
  'hx-target': '#mermaid-output',
  'hx-get': 'update-layout',
  'hx-swap': 'outerHTML  transition:true',
  'hx-include': '#sessionId, #search-panel, input[name="navigationPanelTab"]',
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
      </section>

      <div id="mermaid-wrapper">
        <this.mermaidTarget target="mermaid-output" />
        <div id="spinner" class="spinner" />
      </div>
      <this.Legend showContent={false} />
      <this.navPanelPlaceholder expanded={false} edit={canEdit} />
      <this.svgControls svgRawHeight={svgHeight} svgRawWidth={svgWidth} />
      <this.editToggle canEdit={canEdit} />
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
    return (
      <div id={target} class="mermaid" {...attributes}>
        {output}
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
    const isRship = isRelationship(entity)
    return (
      <div id="navigation-panel-details">
        <section>
          <h3>Basic Information</h3>
          <p>
            <b>Display Name:</b>
          </p>
          {entity?.displayName?.en ? (
            EditableText({
              edit,
              definedIn,
              putRoute: isRship ? 'relationshipDisplayName' : 'displayName',
              additionalBody: {
                ...(isRship ? { relationshipName: entity.name } : {}),
              },
              text: entity?.displayName?.en,
              maxLength: 64,
            })
          ) : (
            <p>'displayName' key missing in original file</p>
          )}
          <p>
            <b>Description:</b>
          </p>

          {entity.description?.en ? (
            EditableText({
              edit,
              definedIn,
              putRoute: isRship ? 'relationshipDescription' : 'description',
              additionalBody: {
                ...(isRship ? { relationshipName: entity.name } : {}),
              },
              text: entity.description.en,
              multiline: true,
              maxLength: 512,
            })
          ) : (
            <p>'description' key missing in original file</p>
          )}
          <p>
            <b>Comment:</b>
          </p>
          {entity.comment ? (
            EditableText({
              edit,
              definedIn,
              putRoute: isRship ? 'relationshipComment' : 'comment',
              additionalBody: {
                ...(isRship ? { relationshipName: entity.name } : {}),
              },
              text: entity.comment,
              multiline: true,
              maxLength: 512,
            })
          ) : (
            <p>'comment' key missing in original file</p>
          )}
        </section>
        <AccordionSection heading={'Entity Identifiers'} collapsed={false}>
          <p>
            <b>ID: </b>
            {entity.Id}
          </p>
          <p>
            <b>Entity Kind: </b>
            {entity.EntityKind}
          </p>
          <p>
            <b>Extends: </b>
            {isInterface(entity) && entity.extends.length > 0
              ? entity.extends.map((entityId) => getDisplayNameOrId(model[entityId]))
              : 'None'}
          </p>
        </AccordionSection>
        <AccordionSection heading={'Properties'} collapsed={false}>
          {isInterface(entity) && Object.keys(entity.properties).length > 0
            ? Object.entries(entity.properties).map(([name, id]) => {
                const property = model[id]
                if (!isProperty(property) || !property.DefinedIn) return
                return (
                  <>
                    <EditableText
                      edit={edit}
                      definedIn={property.DefinedIn}
                      putRoute="propertyName"
                      text={name}
                      additionalBody={{ propertyName: name }}
                      maxLength={64}
                    />
                    {property.comment ? (
                      EditableText({
                        edit,
                        definedIn: property.DefinedIn,
                        putRoute: 'propertyComment',
                        text: property.comment,
                        additionalBody: { propertyName: name },
                        multiline: true,
                        maxLength: 512,
                      })
                    ) : (
                      <p>'comment' key missing in original file</p>
                    )}
                    <br />
                  </>
                )
              })
            : 'None'}
        </AccordionSection>
        <AccordionSection heading={'Relationships'} collapsed={false}>
          {isInterface(entity) && Object.keys(entity.relationships).length > 0
            ? Object.entries(entity.relationships).map(([name, id]) => {
                const relationship = model[id]
                return (
                  <>
                    <p>
                      <b>{escapeHtml(name)}: </b>
                      {escapeHtml(relationship?.comment ?? '-')}
                    </p>
                    <p>
                      <b>Target: </b>
                      {isRelationship(relationship) && relationship.target
                        ? getDisplayNameOrId(model[relationship.target])
                        : '-'}
                    </p>
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

    return (
      <div id="navigation-panel-tree">
        <this.navigationPanelTreeLevel
          highlightedEntityId={entityId}
          highlightedEntitySet={defaultExpandSet}
          fileTree={fileTree}
        />
      </div>
    )
  }

  navigationPanelTreeLevel = ({
    highlightedEntityId,
    highlightedEntitySet,
    fileTree,
  }: {
    highlightedEntityId?: DtdlId
    highlightedEntitySet: Set<DtdlPath>
    fileTree: DtdlPath[]
  }): JSX.Element => {
    return (
      <>
        {fileTree.map((path) => {
          const isHighlighted = 'id' in path ? path.id === highlightedEntityId : false
          const highlightClass = isHighlighted ? 'nav-tree-leaf-highlighted' : ''

          if (path.type === 'fileEntryContent' || path.entries.length === 0) {
            return (
              <div
                class={`navigation-panel-tree-leaf tree-icon ${this.navigationPanelNodeClass(path)} ${highlightClass}`}
              >
                {escapeHtml(path.name)}
              </div>
            )
          }

          const isExpanded = highlightedEntitySet.has(path)
          return (
            <div class="accordion-parent">
              <button
                class={`navigation-panel-tree-node tree-icon ${this.navigationPanelNodeClass(path)} ${highlightClass}`}
                {...{ [isExpanded ? 'aria-expanded' : 'aria-hidden']: '' }}
                onclick="globalThis.toggleAccordion(event)"
              >
                {escapeHtml(path.name)}
              </button>
              <div class="accordion-content" {...{ [isExpanded ? 'aria-expanded' : 'aria-hidden']: '' }}>
                <div>
                  <this.navigationPanelTreeLevel
                    highlightedEntityId={highlightedEntityId}
                    highlightedEntitySet={highlightedEntitySet}
                    fileTree={path.entries}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </>
    )
  }

  navigationPanelNodeClass = (path: DtdlPath): 'directory' | 'file' | 'interface' | 'relationship' | 'property' => {
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

        <label for="diagram-type-select">Diagram Type</label>
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
      <a id="open-button" href={`/open`} class="button">
        Open Ontology
      </a>
    )
  }

  private shareOntology = () => {
    // htmx component to generate a shareable link for the ontology
    return (
      <>
        <a id="share-ontology" onclick="globalThis.showShareModal()" class="button">
          Share Ontology
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
          <span id="edit-toggle-text">View</span>
          <label class="switch">
            <form
              hx-get="edit-model"
              hx-target="#navigation-panel"
              hx-trigger="checked"
              hx-include="#sessionId"
              hx-swap="outerHTML"
              hx-vals="js:{ editMode: event.detail.checked }"
            >
              <input type="checkbox" disabled={!canEdit} onclick="globalThis.toggleEditSwitch(event)" />
              <span class="slider"></span>
            </form>
          </label>
        </div>
        <div id="edit-buttons">
          <button id="add-node-button"></button>
          <button id="edit-node-button"></button>
          <button id="delete-node-button"></button>
        </div>
      </div>
    )
  }
}
