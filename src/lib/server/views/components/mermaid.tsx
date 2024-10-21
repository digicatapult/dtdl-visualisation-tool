/// <reference types="@kitajs/html/htmx.d.ts" />
import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Layout, layoutEntries } from '../../models/mermaidLayouts.js'
import { Page } from '../common.js'

@singleton()
export default class MermaidTemplates {
  constructor() { }

  public MermaidRoot = ({ generatedOutput, layout }: { generatedOutput: string, layout: Layout }) => (
    <Page title={'Mermaid Ontology visualiser'}>
      <this.layoutForm layout={layout} />
      <this.mermaidGenerated generatedOutput={generatedOutput} />
      <div id="navigation-panel">
        <pre>
          <code id="navigationPanelContent">Click on a node to view attributes</code>
        </pre>
      </div>
    </Page>
  )

  public mermaidGenerated = ({ generatedOutput }: { generatedOutput: JSX.Element }): JSX.Element => {
    return (
      <div id="generatedMarkdown">
        {generatedOutput}
      </div>
    )
  }

  public layoutForm = ({ layout, swapOutOfBand }: { layout: Layout; swapOutOfBand?: boolean }) => {
    const attributes = {
      'hx-target': '#generatedMarkdown',
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
