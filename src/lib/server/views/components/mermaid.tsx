/// <reference types="@kitajs/html/htmx.d.ts" />
import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { type Layout, layoutEntries } from '../../models/mermaidLayouts.js'
import { Page } from '../common.js'

@singleton()
export default class MermaidTemplates {
  constructor() {}

  public MermaidRoot = ({ graph, layout }: { graph: string; layout: Layout }) => (
    <Page title={'Mermaid Ontology visualiser'}>
      <this.layoutForm layout={layout} />
      <this.mermaidTarget target="mermaid-output" />
      <this.mermaidMarkdown graph={graph} />
      <div id="navigation-panel">
        <pre>
          <code id="navigationPanelContent">Click on a node to view attributes</code>
        </pre>
      </div>
    </Page>
  )

  public mermaidMarkdown = ({ graph, layout }: { graph: string; layout?: Layout }) => {
    const attributes = layout
      ? {
          'hx-on::after-settle': `globalThis.renderLayoutChange('mermaid-output', 'graphMarkdown', '${layout}')`,
        }
      : {
          'hx-get': '/update-layout',
          'hx-swap': 'outerHTML',
          'hx-trigger': 'load',
          'hx-on::after-settle': `globalThis.renderMermaid('mermaid-output', 'graphMarkdown')`,
        }
    return (
      <div id="graphMarkdown" style="display: none" {...attributes}>
        {escapeHtml(graph)}
      </div>
    )
  }

  private mermaidTarget = ({ target }: { target: string }) => <div id={target} class="mermaid"></div>

  public layoutForm = ({ layout, swapOutOfBand }: { layout: Layout; swapOutOfBand?: boolean }) => {
    const attributes = {
      'hx-target': '#graphMarkdown',
      'hx-get': '/update-layout',
      'hx-swap': 'outerHTML',
    }
    if (swapOutOfBand) {
      attributes['hx-swap-oob'] = 'true'
    }

    return (
      <form id="layout-buttons" class="button-group" {...attributes}>
        {layoutEntries.map((entry) => (
          <button name="layout" value={entry} class={entry === layout ? 'highlighted' : ''}>
            {escapeHtml(entry)}
          </button>
        ))}
      </form>
    )
  }
}
