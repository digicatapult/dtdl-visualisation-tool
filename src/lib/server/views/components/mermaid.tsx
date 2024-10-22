/// <reference types="@kitajs/html/htmx.d.ts" />
import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { type Layout, layoutEntries } from '../../models/mermaidLayouts.js'
import { Page } from '../common.js'

const commonUpdateAttrs = {
  'hx-target': '#graphMarkdown',
  'hx-get': '/update-layout',
  'hx-swap': 'outerHTML',
  'hx-include': '#layout-buttons',
}

@singleton()
export default class MermaidTemplates {
  constructor() {}

  public MermaidRoot = ({ graph, search, layout }: { graph: string | null; search?: string; layout: Layout }) => (
    <Page title={'Mermaid Ontology visualiser'}>
      <this.layoutForm layout={layout} search={search} />
      <this.mermaidTarget target="mermaid-output" />
      <this.mermaidMarkdown graph={graph} />
      <div id="navigation-panel">
        <pre>
          <code id="navigationPanelContent">Click on a node to view attributes</code>
        </pre>
      </div>
    </Page>
  )

  public mermaidMarkdown = ({ graph, layout }: { graph: string | null; layout?: Layout }) => {
    const attributes = layout
      ? {
          'hx-on::after-settle': `globalThis.renderLayoutChange('mermaid-output', 'graphMarkdown', '${layout}')`,
        }
      : {
          ...commonUpdateAttrs,

          'hx-trigger': 'load',
          'hx-on::after-settle': `globalThis.renderMermaid('mermaid-output', 'graphMarkdown')`,
        }
    return (
      <div id="graphMarkdown" style="display: none" {...attributes}>
        {escapeHtml(graph ?? '')}
      </div>
    )
  }

  private mermaidTarget = ({ target }: { target: string }) => <div id={target} class="mermaid"></div>

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
