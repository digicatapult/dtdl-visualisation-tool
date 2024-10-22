/// <reference types="@kitajs/html/htmx.d.ts" />
import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Layout, layoutEntries } from '../../models/mermaidLayouts.js'
import { Page } from '../common.js'

@singleton()
export default class MermaidTemplates {
  constructor() { }

  public MermaidRoot = ({ layout }: { layout: Layout }) => (
    <Page title={'Mermaid Ontology visualiser'}>
      <this.layoutForm layout={layout} />
      <this.mermaidTarget target="mermaid-output" />
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

  public layoutForm = ({ layout, swapOutOfBand }: { layout: Layout; swapOutOfBand?: boolean }) => {
    const attributes = {
      'hx-target': '#mermaid-output',
      'hx-get': '/update-layout',
      'hx-swap': 'outerHTML',
    }
    if (swapOutOfBand) {
      attributes['hx-swap-oob'] = 'true'
    }

    return (
      <form id="layout-buttons" class="button-group" {...attributes}>
        {/* note the hidden duplicate "layout" input to make sure the current value of layout is passed if the search changes */}
        <input name="layout" type="hidden" value={layout} />
        {layoutEntries.map((entry) => (
          <button name="layout" value={entry} class={entry === layout ? 'highlighted' : ''}>
            {escapeHtml(entry)}
          </button>
        ))}
      </form>
    )
  }
}
