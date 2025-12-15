/// <reference types="@kitajs/html/htmx.d.ts" />

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { escapeHtml } from '@kitajs/html'
import { randomUUID } from 'crypto'
import express from 'express'
import { container, singleton } from 'tsyringe'
import { Env } from '../../env/index.js'
import { DeletableEntities } from '../../models/controllerTypes.js'
import { DiagramType, diagramTypes } from '../../models/mermaidDiagrams.js'
import { DtdlId, UUID } from '../../models/strings.js'
import { hasFileTreeErrors } from '../../utils/dtdl/fileTreeErrors.js'
import { DtdlPath } from '../../utils/dtdl/parser.js'
import { Page } from '../common.js'
import { AddNode } from './addNode.js'
import { NavigationPanelDetails } from './navigationPanelDetails.js'

const env = container.resolve(Env)
const commonRerenderAttrs = {
  'hx-target': '#mermaid-output',
  'hx-swap': 'outerHTML  transition:true',
  'hx-include': '#sessionId, #search-panel, input[name="navigationPanelTab"], #navigationPanelExpanded',
  'hx-indicator': '#spinner',
  'hx-disabled-elt': 'select',
} as const
type CommonRerenderAttrs = typeof commonRerenderAttrs

const commonUpdateAttrs: CommonRerenderAttrs & { 'hx-get': string } = {
  ...commonRerenderAttrs,
  'hx-get': 'update-layout',
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
    editDisabledReason,
    req,
    ontologyId,
  }: {
    search?: string
    sessionId: UUID
    diagramType: DiagramType
    svgWidth?: number
    svgHeight?: number
    canEdit: boolean
    editDisabledReason?: 'errors' | 'permissions'
    req?: express.Request
    ontologyId: UUID
  }) => (
    <Page title={'UKDTC'} req={req}>
      <input id="sessionId" name="sessionId" type="hidden" value={escapeHtml(sessionId)} />
      <section id="toolbar">
        <this.searchPanel search={search} diagramType={diagramType} svgWidth={svgWidth} svgHeight={svgHeight} />
        <this.uploadForm />
        <this.shareOntology />
        <this.publishForm canPublish={canEdit} ontologyId={ontologyId} />
      </section>

      <div id="mermaid-wrapper">
        <this.mermaidTarget target="mermaid-output" />
        <div id="spinner" class="spinner" />
      </div>
      <this.Legend showContent={false} />
      <this.navPanelPlaceholder expanded={false} edit={canEdit} />
      <this.svgControls svgRawHeight={svgHeight} svgRawWidth={svgWidth} />
      <this.editToggle canEdit={canEdit} editDisabledReason={editDisabledReason} />
      <this.deleteDialog />
      <this.publishDialog />
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
    swapOutOfBand,
  }: {
    generatedOutput?: JSX.Element
    target: string
    swapOutOfBand?: boolean
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
      <div id="mermaid-output" class="mermaid" hx-swap-oob={swapOutOfBand ? 'true' : undefined} {...attributes}>
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

  public addNode = ({
    dtdlModelId,
    swapOutOfBand,
    displayNameIdMap,
    folderTree,
    entityId,
  }: {
    dtdlModelId: string
    swapOutOfBand?: boolean
    displayNameIdMap: Record<string, string>
    folderTree: DtdlPath[]
    entityId?: DtdlId
  }): JSX.Element => {
    return (
      <AddNode
        dtdlModelId={dtdlModelId}
        swapOutOfBand={swapOutOfBand}
        displayNameIdMap={displayNameIdMap}
        folderTree={folderTree}
        entityId={entityId}
        folderTreeLevel={this.folderTreeLevel}
      />
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
    return <NavigationPanelDetails entityId={entityId} model={model} edit={edit} />
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
        {hasFileTreeErrors(fileTree) && (
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

  // Check if a directory contains subdirectories
  private hasSubdirectories = (entries: DtdlPath[]): boolean => {
    return entries.some((entry) => entry.type === 'directory')
  }

  // Build folder tree button classes
  private buildFolderButtonClasses = (
    path: DtdlPath,
    hasSubdirs: boolean,
    isHighlighted: boolean,
    isSelected: boolean
  ): string => {
    const classes = [
      'folder-tree-button',
      'tree-icon',
      hasSubdirs ? '' : 'no-arrow',
      this.navigationPanelNodeClass(path),
      isHighlighted ? 'folder-tree-leaf-highlighted' : '',
      isSelected ? 'folder-tree-selected' : '',
    ]
    return classes.filter(Boolean).join(' ')
  }

  folderTreeLevel = ({
    highlightedEntityId,
    highlightedEntitySet,
    fileTree,
    pathPrefix = '',
    selectedPath = null,
  }: {
    highlightedEntityId?: DtdlId
    highlightedEntitySet: Set<DtdlPath>
    fileTree: DtdlPath[]
    pathPrefix?: string
    selectedPath?: string | null
  }): JSX.Element => {
    return (
      <>
        {fileTree.map((path) => {
          const currentPath = pathPrefix ? `${pathPrefix}/${path.name}` : path.name
          const isHighlighted = 'id' in path ? path.id === highlightedEntityId : false
          const isSelected = selectedPath === currentPath
          const highlightClass = isHighlighted ? 'folder-tree-leaf-highlighted' : ''
          const isExpanded = highlightedEntitySet.has(path)

          if (path.type !== 'directory') {
            return (
              <div class={` ${this.navigationPanelNodeClass(path)} ${highlightClass}`.trim()}>
                {escapeHtml(path.name)}
              </div>
            )
          }

          // Check if this directory contains subdirectories to show/hide arrow
          const hasSubdirs = this.hasSubdirectories(path.entries)

          return (
            <div class="accordion-parent">
              <button
                type="button"
                class={this.buildFolderButtonClasses(path, hasSubdirs, isHighlighted, isSelected)}
                {...{ [isExpanded ? 'aria-expanded' : 'aria-hidden']: '' }}
                onclick={`globalThis.handleFolderSelection(event, '${escapeHtml(currentPath)}'); globalThis.toggleAccordion(event);`}
                data-folder-path={escapeHtml(currentPath)}
              >
                {escapeHtml(path.name)}
              </button>
              <div class="accordion-content" {...{ [isExpanded ? 'aria-expanded' : 'aria-hidden']: '' }}>
                <div>
                  <this.folderTreeLevel
                    highlightedEntityId={highlightedEntityId}
                    highlightedEntitySet={highlightedEntitySet}
                    fileTree={path.entries}
                    pathPrefix={currentPath}
                    selectedPath={selectedPath}
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

  public publishDialog = ({ ontologyId }: { ontologyId?: UUID } = {}) => {
    const defaultBranchName = `ontology-update-${Date.now()}`

    return (
      <dialog id="publish-dialog">
        <form
          hx-post="/publish"
          hx-target=".toast-wrapper:empty"
          hx-swap="beforeend"
          hx-vals={JSON.stringify({
            ontologyId,
          })}
          hx-on--after-request="document.getElementById('publish-dialog').close()"
          hx-indicator="#spin"
        >
          <div class="modal-content">
            <h3>Publish Changes</h3>
            <label for="commitMessage">Commit message</label>
            <input type="text" id="commitMessage" name="commitMessage" value="Update DTDL" required />
            <label for="prTitle">Pull Request title</label>
            <input
              type="text"
              id="prTitle"
              name="prTitle"
              value="Update ontology files from DTDL visualisation tool"
              required
            />
            <label for="description">Extended description</label>
            <textarea id="description" name="description" rows="4" required>
              This PR was automatically created by the DTDL visualisation tool.
            </textarea>
            <div class="radio-group">
              <label>
                <input class="circle-radio" type="radio" name="publishType" value="newBranch" checked />
                Create a new branch for this commit and start a pull request
              </label>
            </div>

            <input
              type="text"
              name="branchName"
              value={defaultBranchName}
              oninput="globalThis.validateBranchName(this)"
              required
            />
            <button type="submit" class="rounded-button">
              Publish Changes
            </button>
            <div id="spin" class="spinner" />
          </div>
        </form>
        <form method="dialog">
          <button class="modal-button" />
        </form>
      </dialog>
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
              <input
                class="circle-radio"
                type="radio"
                name="link-type"
                value="short"
                checked
                onchange="globalThis.updateShareLink()"
              />
              <span>Entire ontology</span>
            </label>
            <label>
              <input
                class="circle-radio"
                type="radio"
                name="link-type"
                value="full"
                onchange="globalThis.updateShareLink()"
              />
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

  private publishForm = ({ canPublish, ontologyId }: { canPublish: boolean; ontologyId: UUID }) => {
    if (!env.get('EDIT_ONTOLOGY')) return <></>
    return (
      <button
        id="publish-ontology"
        class={`button ${!canPublish ? 'disabled' : ''}`}
        disabled={!canPublish}
        hx-get={`/publish/dialog?ontologyId=${ontologyId}`}
        hx-target="#publish-dialog"
        hx-swap="outerHTML"
        hx-on--after-request="document.getElementById('publish-dialog').showModal()"
        title={
          canPublish
            ? 'Click to publish ontology'
            : 'Only Ontologies from github that you have write permissions on, can be published'
        }
      >
        Publish
      </button>
    )
  }

  public editToggle = ({
    canEdit,
    editDisabledReason,
  }: {
    canEdit: boolean
    editDisabledReason?: 'errors' | 'permissions'
  }) => {
    if (!env.get('EDIT_ONTOLOGY')) return <></>

    const getTooltip = () => {
      if (canEdit) return 'Click to edit ontology'
      if (editDisabledReason === 'errors') return 'You need to fix errors in ontology to be able to edit'
      return 'Only Ontologies from github that you have write permissions on, can be edited'
    }

    return (
      <div id="edit-controls">
        <div id="edit-toggle" title={getTooltip()} class={canEdit ? '' : 'disabled'}>
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
          <button
            {...commonUpdateAttrs}
            id="add-node-button"
            hx-get={`entity/add-new-node`}
            hx-target="#navigation-panel"
            hx-swap="outerHTML"
          ></button>
        </div>
      </div>
    )
  }
}
