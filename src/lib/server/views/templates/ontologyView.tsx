/// <reference types="@kitajs/html/htmx.d.ts" />

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { escapeHtml } from '@kitajs/html'
import express from 'express'
import { singleton } from 'tsyringe'
import { ModelRow } from '../../../db/types.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { DtdlId, UUID } from '../../models/strings.js'
import { hasFileTreeErrors } from '../../utils/dtdl/fileTreeErrors.js'
import { DtdlPath } from '../../utils/dtdl/parser.js'
import { Page } from '../common.js'
import { AddNode } from '../components/addNode.js'
import { DeleteDialog } from '../components/deleteDialog.js'
import { EditToggle } from '../components/editToggle.js'
import { GithubLink } from '../components/githubLink.js'
import { buildFolderButtonClasses, getNavigationPanelNodeClass, hasSubdirectories } from '../components/helpers.js'
import { Legend } from '../components/legend.js'
import { MermaidTarget } from '../components/mermaidTarget.js'
import { NavigationPanelDetails } from '../components/navigationPanelDetails.js'
import { PublishDialog } from '../components/publishDialog.js'
import { PublishForm } from '../components/publishForm.js'
import { SearchPanel } from '../components/searchPanel.js'
import { ShareOntology } from '../components/shareOntology.js'
import { SvgControls } from '../components/svgControls.js'
import { UploadForm } from '../components/uploadForm.js'

@singleton()
export default class OntologyViewTemplates {
  constructor() {}

  navigationPanelNodeClass = getNavigationPanelNodeClass

  public searchPanel = SearchPanel
  public publishDialog = PublishDialog
  public deleteDialog = DeleteDialog
  public Legend = Legend
  public editToggle = EditToggle
  public githubLink = GithubLink
  public svgControls = SvgControls
  public mermaidTarget = MermaidTarget

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
    model,
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
    model: ModelRow
  }) => (
    <Page title={'UKDTC'} req={req}>
      <input id="sessionId" name="sessionId" type="hidden" value={escapeHtml(sessionId)} />
      <section id="toolbar">
        <SearchPanel search={search} diagramType={diagramType} svgWidth={svgWidth} svgHeight={svgHeight} />
        <UploadForm />
        <ShareOntology />
        <PublishForm canPublish={canEdit} ontologyId={ontologyId} />
        <GithubLink model={model} />
      </section>

      <div id="mermaid-wrapper">
        <MermaidTarget target="mermaid-output" />
        <div id="spinner" class="spinner" />
      </div>
      <Legend showContent={false} />
      <this.navPanelPlaceholder expanded={false} edit={canEdit} />
      <SvgControls svgRawHeight={svgHeight} svgRawWidth={svgWidth} />
      <EditToggle canEdit={canEdit} editDisabledReason={editDisabledReason} />
      <DeleteDialog />
      <PublishDialog />
    </Page>
  )

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
          <NavigationPanelDetails entityId={entityId} model={model} edit={edit} />
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

  public folderTreeLevel = ({
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
              <div class={` ${getNavigationPanelNodeClass(path)} ${highlightClass}`.trim()}>
                {escapeHtml(path.name)}
              </div>
            )
          }

          // Check if this directory contains subdirectories to show/hide arrow
          const hasSubdirs = hasSubdirectories(path.entries)

          return (
            <div class="accordion-parent">
              <button
                type="button"
                class={buildFolderButtonClasses(
                  path,
                  hasSubdirs,
                  isHighlighted,
                  isSelected,
                  getNavigationPanelNodeClass
                )}
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
}
