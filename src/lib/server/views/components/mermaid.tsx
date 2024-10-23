/// <reference types="@kitajs/html/htmx.d.ts" />
import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Layout, layoutEntries } from '../../models/mermaidLayouts.js'
import { Page } from '../common.js'

const commonUpdateAttrs = {
  'hx-target': '#graphMarkdown',
  'hx-get': '/update-layout',
  'hx-swap': 'outerHTML',
  'hx-include': '#layout-buttons',
}

@singleton()
export default class MermaidTemplates {
  constructor() { }

  public MermaidRoot = ({ generatedOutput, search, layout }: { generatedOutput: JSX.Element | undefined; search?: string; layout: Layout }) => (
    <Page title={'Mermaid Ontology visualiser'}>
      <this.layoutForm layout={layout} search={search} />
      <this.mermaidTarget target="mermaid-output" generatedOutput={generatedOutput} />
      <div id="navigation-panel">
        <pre>
          <code id="navigationPanelContent">Click on a node to view attributes</code>
        </pre>
      </div>
    </Page>
  )

  public mermaidTarget = ({ generatedOutput, target }: { generatedOutput?: JSX.Element, target: string }): JSX.Element => {
    const attributes = generatedOutput
      ? { 'hx-on::after-settle': `globalThis.setMermaidListeners()` }
      : {
        'hx-get': '/update-layout',
        'hx-swap': 'outerHTML',
        'hx-trigger': 'load',
        'hx-on::after-settle': `globalThis.setMermaidListeners()`,
      }
    return (
      <div id={target} class="mermaid" {...attributes}>
        {generatedOutput ?? ''}
      </div>
    )
  }

  public layoutForm = ({
    search,
    layout,
    swapOutOfBand,
  }: {
    search?: string
    layout: Layout
    swapOutOfBand?: boolean
  }) => {
    return (
      <form id="layout-buttons" class="button-group" hx-swap-oob={swapOutOfBand ? 'true' : undefined}>
        <input
          id="search"
          name="search"
          type="search"
          value={escapeHtml(search || '')}
          hx-trigger="input changed delay:500ms, search"
          {...commonUpdateAttrs}
        />
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
