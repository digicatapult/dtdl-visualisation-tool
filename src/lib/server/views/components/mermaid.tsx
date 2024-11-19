/// <reference types="@kitajs/html/htmx.d.ts" />
import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { DiagramType, diagramTypes } from '../../models/mermaidDiagrams.js'
import { Layout, layoutEntries } from '../../models/mermaidLayouts.js'
import { DtdlId, MermaidId } from '../../models/strings.js'
import { getDisplayName, isInterface, isRelationship } from '../../utils/dtdl/extract.js'
import { AccordionSection, Page } from '../common.js'

const commonUpdateAttrs = {
  'hx-target': '#mermaid-output',
  'hx-get': '/update-layout',
  'hx-swap': 'outerHTML',
  'hx-include': '#search-panel',
  'hx-indicator': '.htmx-indicator',
  'hx-disabled-elt': 'select',
}

@singleton()
export default class MermaidTemplates {
  constructor() {}

  public MermaidRoot = ({
    generatedOutput,
    search,
    highlightNodeId,
    layout,
    diagramType,
    expandedIds,
    lastSearch,
  }: {
    generatedOutput?: JSX.Element | undefined
    search?: string
    highlightNodeId?: string
    layout: Layout
    diagramType: DiagramType
    expandedIds?: string[]
    lastSearch?: string
  }) => (
    <Page title={'UKDTC'}>
      <this.searchPanel
        layout={layout}
        search={search}
        highlightNodeId={highlightNodeId}
        diagramType={diagramType}
        expandedIds={expandedIds}
        lastSearch={lastSearch}
      />

      <div id="mermaid-wrapper">
        <this.mermaidTarget target="mermaid-output" generatedOutput={generatedOutput} />
        <div id="spinner" class="htmx-indicator" />
        <div id="svg-controls">
          <button id="zoom-in">+</button>
          <button id="reset-pan-zoom">◯</button>
          <button id="zoom-out">-</button>
        </div>
      </div>
      <this.navigationPanel />
    </Page>
  )

  public mermaidTarget = ({
    generatedOutput,
    target,
  }: {
    generatedOutput?: JSX.Element
    target: string
  }): JSX.Element => {
    const attributes = generatedOutput
      ? { 'hx-on::after-settle': `globalThis.setMermaidListeners()` }
      : {
          'hx-trigger': 'load',
          ...commonUpdateAttrs,
        }
    const output = generatedOutput ?? ''
    return (
      <div id={target} class="mermaid htmx-indicator" {...attributes}>
        {output}
      </div>
    )
  }

  public navigationPanel = ({
    swapOutOfBand,
    entityId,
    model,
  }: {
    swapOutOfBand?: boolean
    entityId?: DtdlId
    model?: DtdlObjectModel
  }): JSX.Element => {
    const entity = entityId && model ? model[entityId] : undefined
    return (
      <aside id="navigation-panel" hx-swap-oob={swapOutOfBand ? 'true' : undefined}>
        {entity && model ? (
          <>
            <section>
              <h3>Basic Information</h3>
              <p>
                <b>Display Name: </b>
                {escapeHtml(getDisplayName(entity))}
              </p>
              <p>
                <b>Description: </b>
                {entity.description.en ?? 'None'}
              </p>
              <p>
                <b>Comments: </b>
                {entity.comment ?? 'None'}
              </p>
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
                  ? entity.extends.map((entityId) => getDisplayName(model[entityId]))
                  : 'None'}
              </p>
            </AccordionSection>
            <AccordionSection heading={'Properties'} collapsed={false}>
              {isInterface(entity)
                ? Object.entries(entity.properties).map(([name, id]) => (
                    <p>
                      <b>{escapeHtml(name)}: </b>
                      {escapeHtml(model[id].comment) ?? '-'}
                    </p>
                  ))
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
                          {escapeHtml(relationship?.comment) ?? '-'}
                        </p>
                        <p>
                          <b>Target: </b>
                          {isRelationship(relationship) && relationship.target
                            ? getDisplayName(model[relationship.target])
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
          </>
        ) : (
          <section>Click on a node to view attributes</section>
        )}
      </aside>
    )
  }

  public searchPanel = ({
    search,
    layout,
    swapOutOfBand,
    highlightNodeId,
    diagramType,
    expandedIds,
    lastSearch,
  }: {
    search?: string
    layout: Layout
    swapOutOfBand?: boolean
    highlightNodeId?: MermaidId
    diagramType: DiagramType
    expandedIds?: string[]
    lastSearch?: string
  }) => {
    return (
      <form id="search-panel" class="button-group" hx-swap-oob={swapOutOfBand ? 'true' : undefined}>
        <h2>UKDTC</h2>
        <input
          id="search"
          name="search"
          type="search"
          value={escapeHtml(search || '')}
          placeholder="Search"
          hx-trigger="input changed delay:500ms, search"
          hx-sync="this:replace"
          {...commonUpdateAttrs}
        />
        <input id="highlightNodeId" name="highlightNodeId" type="hidden" value={escapeHtml(highlightNodeId || '')} />
        <input id="lastSearch" name="lastSearch" type="hidden" value={escapeHtml(lastSearch || '')} />
        {expandedIds?.map((id, index) => (
          <input id={`expandedIds_${index}`} name="expandedIds" type="hidden" value={id} />
        ))}
        <label for="diagramType">Diagram Type</label>
        <select id="diagramType" name="diagramType" hx-trigger="input changed" {...commonUpdateAttrs}>
          {diagramTypes.map((entry) => (
            <option value={entry} selected={entry === diagramType}>
              {escapeHtml(entry)}
            </option>
          ))}
        </select>
        <label for="layout">Layout</label>
        <select
          id="layout"
          name="layout"
          hx-trigger="input changed"
          disabled={diagramType === 'classDiagram'}
          {...commonUpdateAttrs}
        >
          {layoutEntries.map((entry) => (
            <option value={entry} selected={entry === layout}>
              {escapeHtml(entry)}
            </option>
          ))}
        </select>
      </form>
    )
  }
}
