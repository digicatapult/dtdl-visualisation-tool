import { escapeHtml, type PropsWithChildren } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Page } from '../common.js'

@singleton()
export default class MermaidTemplates {
  constructor() {}
  public flowchart = (props: PropsWithChildren<{ graph: string }>) => {
    return (
      <Page title="Mermaid - Homepage">
        <pre class="mermaid">{escapeHtml(props.graph)}</pre>
      </Page>
    )
  }
}
