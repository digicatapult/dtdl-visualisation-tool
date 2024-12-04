/// <reference types="@kitajs/html/htmx.d.ts" />

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { escapeHtml } from '@kitajs/html'
import { randomUUID } from 'crypto'
import { singleton } from 'tsyringe'
import { DiagramType, diagramTypes } from '../../models/mermaidDiagrams.js'
import { Layout, layoutEntries } from '../../models/mermaidLayouts.js'
import { DtdlId, UUID } from '../../models/strings.js'
import { getDisplayName, isInterface, isRelationship } from '../../utils/dtdl/extract.js'
import { AccordionSection, Page } from '../common.js'

const commonUpdateAttrs = {
  'hx-target': '#mermaid-output',
  'hx-get': '/update-layout',
  'hx-swap': 'outerHTML  transition:true',
  'hx-include': '#search-panel',
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
    generatedOutput,
    search,
    layout,
    sessionId,
    diagramType,
    svgWidth,
    svgHeight,
  }: {
    generatedOutput?: JSX.Element | undefined
    search?: string
    layout: Layout
    sessionId: UUID
    diagramType: DiagramType
    svgWidth?: number
    svgHeight?: number
  }) => (
    <Page title={'UKDTC'}>
      <this.searchPanel
        layout={layout}
        search={search}
        sessionId={sessionId}
        diagramType={diagramType}
        svgWidth={svgWidth}
        svgHeight={svgHeight}
      />

      <div id="mermaid-wrapper">
        <this.mermaidTarget target="mermaid-output" generatedOutput={generatedOutput} />
        <div id="spinner" />
        <div id="svg-controls">
          <button id="zoom-in">+</button>
          <button id="reset-pan-zoom">◯</button>
          <button id="zoom-out">-</button>
        </div>
        <this.Legend showContent={false} />
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
              {isInterface(entity) && Object.keys(entity.properties).length > 0
                ? Object.entries(entity.properties).map(([name, id]) => (
                    <p>
                      <b>{escapeHtml(name)}: </b>
                      {escapeHtml(model[id].comment ?? '-')}
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
                          {escapeHtml(relationship?.comment ?? '-')}
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
    sessionId,
    diagramType,
    svgWidth,
    svgHeight,
    currentZoom,
    currentPanX,
    currentPanY,
  }: {
    // inputs with current state
    search?: string
    layout: Layout
    diagramType: DiagramType
    // hidden inputs not set by input controls
    sessionId: UUID
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
        <h2>UKDTC</h2>
        <input
          id="search"
          name="search"
          type="search"
          value={escapeHtml(search || '')}
          placeholder="Search"
          hx-trigger="input changed delay:500ms, search"
          {...commonUpdateAttrs}
        />
        <input id="sessionId" name="sessionId" type="hidden" value={escapeHtml(sessionId)} />

        <input id="svgWidth" name="svgWidth" type="hidden" value={maybeNumberToAttr(svgWidth, 300)} />
        <input id="svgHeight" name="svgHeight" type="hidden" value={maybeNumberToAttr(svgHeight, 100)} />
        <input id="currentZoom" name="currentZoom" type="hidden" value={maybeNumberToAttr(currentZoom, 1)} />
        <input id="currentPanX" name="currentPanX" type="hidden" value={maybeNumberToAttr(currentPanX, 0)} />
        <input id="currentPanY" name="currentPanY" type="hidden" value={maybeNumberToAttr(currentPanY, 0)} />

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
}
