/// <reference types="@kitajs/html/htmx.d.ts" />
import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
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
    layout,
  }: {
    generatedOutput?: JSX.Element | undefined
    search?: string
    layout: Layout
  }) => (
    <Page title={'Mermaid Ontology visualiser'}>
      <this.layoutForm layout={layout} search={search} />
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
  }: {
    search?: string
    layout: Layout
    swapOutOfBand?: boolean
    highlightNodeId?: MermaidId
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
        <select id="layout" name="layout" hx-trigger="input changed" {...commonUpdateAttrs}>
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
