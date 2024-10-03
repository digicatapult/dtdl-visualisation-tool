/// <reference types="@kitajs/html/htmx.d.ts" />
import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Page } from '../common.js'

export const layoutEntries = [
  'dagre',
  'dagre-wrapper',
  'elk.stress',
  'elk.force',
  'elk.mrtree',
  'elk.sporeOverlap',
] as const

export type Layout = 'dagre' | 'dagre-wrapper' | 'elk.stress' | 'elk.force' | 'elk.mrtree' | 'elk.sporeOverlap'

@singleton()
export default class MermaidTemplates {
  constructor() {}

  public MermaidRoot = ({ graph }: { graph: string }) => (
    <Page title={'Mermaid Ontology visualiser'}>
      <this.layoutForm />
      <this.mermaidTarget target="mermaidOutput" />
      <this.mermaidMarkdown graph={graph} />
      <div id="navigationPanel" />
    </Page>
  )

  public mermaidMarkdown = ({ graph, layout }: { graph: string; layout?: Layout }) => {
    const attributes = layout
      ? {
          'hx-on::after-settle': `globalThis.renderLayoutChange('mermaidOutput', 'graphMarkdown', '${layout}')`,
        }
      : {
          'hx-get': '/update-layout',
          'hx-swap': 'outerHTML',
          'hx-trigger': 'load',
          'hx-on::after-settle': `globalThis.renderMermaid('mermaidOutput', 'graphMarkdown')`,
        }
    return (
      <div id="graphMarkdown" style="display: none" {...attributes}>
        {escapeHtml(graph)}
      </div>
    )
  }

  public mermaidTarget = ({ target }: { target: string }) => <div id={target} class="mermaid"></div>

  public layoutForm = () => {
    const attributes = {
      'hx-target': '#graphMarkdown',
      'hx-get': '/update-layout',
      'hx-swap': 'outerHTML',
    }

    return (
      <form id="layoutButtons" class="button-group" {...attributes}>
        {layoutEntries.map((entry) => (
          <button name="layout" value={entry}>
            {escapeHtml(entry)}
          </button>
        ))}
      </form>
    )
  }
}
