import { escapeHtml, type PropsWithChildren } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Page } from '../common.js'

@singleton()
export default class MermaidTemplates {
  constructor() {}
  public flowchart = (props: PropsWithChildren<{ graph: string }>) => {
    return (
      <Page title="Mermaid - Homepage">
        <button id='layouts' >dagre</button>
        <button id='layouts' >dagre-wrapper</button>
        <button id='layouts' >elk.stress</button>
        <button id='layouts' >elk.force</button>
        <button id='layouts' >elk.mrtree</button>
        <button id='layouts' >elk.sporeOverlap</button>
        
        <div id='graphMarkdown' style='display: none'>{escapeHtml(props.graph)}</div>
        <div id="mermaidOutput" class='mermaid'></div>
      </Page>
    )
  }
}
