/// <reference types="@kitajs/html/htmx.d.ts" />
import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { DiagramType, diagramTypes } from '../../models/mermaidDiagrams.js'
import { Layout, layoutEntries } from '../../models/mermaidLayouts.js'
import { MermaidId } from '../../models/strings.js'
import { Page } from '../common.js'

const commonUpdateAttrs = {
  'hx-target': '#mermaid-output',
  'hx-get': '/update-layout',
  'hx-swap': 'outerHTML',
  'hx-include': '#layout-buttons',
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
  }: {
    generatedOutput?: JSX.Element | undefined
    search?: string
    highlightNodeId?: string
    layout: Layout
    diagramType: DiagramType
    expandedIds?: string[]
  }) => (
    <Page title={'Mermaid Ontology visualiser'}>
      <this.layoutForm
        layout={layout}
        search={search}
        highlightNodeId={highlightNodeId}
        diagramType={diagramType}
        expandedIds={expandedIds}
      />

      <div id="mermaid-wrapper">
        <this.mermaidTarget target="mermaid-output" generatedOutput={generatedOutput} />
        <div id="svg-controls">
          <button id="zoom-in">+</button>
          <button id="reset-pan-zoom">◯</button>
          <button id="zoom-out">-</button>
        </div>
      </div>
      <div id="navigation-panel">
        <pre>
          <code id="navigationPanelContent">Click on a node to view attributes</code>
        </pre>
      </div>
    </Page>
  )

  public output = ({ generatedOutput }: { generatedOutput: JSX.Element }): JSX.Element => {
    return generatedOutput
  }

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
          'hx-on::after-settle': `globalThis.setMermaidListeners()`,
          'hx-trigger': 'load',
          ...commonUpdateAttrs,
        }
    const output = generatedOutput ?? ''
    return (
      <div id={target} class="mermaid" {...attributes}>
        <this.output generatedOutput={output} />
      </div>
    )
  }

  public layoutForm = ({
    search,
    layout,
    swapOutOfBand,
    highlightNodeId,
    diagramType,
    expandedIds,
  }: {
    search?: string
    layout: Layout
    swapOutOfBand?: boolean
    highlightNodeId?: MermaidId
    diagramType: DiagramType
    expandedIds?: string[]
  }) => {
    return (
      <form id="layout-buttons" class="button-group" hx-swap-oob={swapOutOfBand ? 'true' : undefined}>
        <input
          id="search"
          name="search"
          type="search"
          value={escapeHtml(search || '')}
          hx-trigger="input changed delay:500ms, search"
          hx-sync="this:replace"
          {...commonUpdateAttrs}
        />
        <input id="highlightNodeId" name="highlightNodeId" type="hidden" value={escapeHtml(highlightNodeId || '')} />
        {expandedIds?.map((id, index) => (
          <input id={`expandedIds_${index}`} name="expandedIds[]" type="hidden" value={id} />
        ))}
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
        <select id="diagramType" name="diagramType" hx-trigger="input changed" {...commonUpdateAttrs}>
          {diagramTypes.map((entry) => (
            <option value={entry} selected={entry === diagramType}>
              {escapeHtml(entry)}
            </option>
          ))}
        </select>
      </form>
    )
  }
}
