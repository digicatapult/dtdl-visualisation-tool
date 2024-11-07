import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { QueryParams } from '../../models/contollerTypes.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import ClassDiagram from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart from './flowchart.js'
import { JSDOM } from 'jsdom'

@singleton()
export class SvgGenerator {
  public browser: Promise<Browser>
  constructor() {
    this.browser = puppeteer.launch({})
  }

  mermaidMarkdownByDiagramType: {
    [k in DiagramType]: IDiagram<k>
  } = {
    flowchart: new Flowchart(),
    classDiagram: new ClassDiagram(),
  }

  async run(dtdlObject: DtdlObjectModel, params: QueryParams, options: ParseMDDOptions = {}): Promise<string> {
    //  Mermaid config
    const parseMDDOptions: ParseMDDOptions = {
      ...options,
      svgId: 'mermaid-svg',
      mermaidConfig: {
        flowchart: {
          useMaxWidth: false,
          htmlLabels: false,
        },
        maxTextSize: 99999999,
        maxEdges: 99999999,
        layout: params.layout,
      },
    }

    const graph = this.mermaidMarkdownByDiagramType[params.diagramType].generateMarkdown(
      dtdlObject,
      ' TD',
      params.highlightNodeId
    )
    if (!graph) return 'No graph'

    const { data } = await renderMermaid(await this.browser, graph, params.output, parseMDDOptions)
    const decoder = new TextDecoder()
    const nodeIdPattern = /^[^-]+\-(.+)\-\d+$/
    const dom = new JSDOM(decoder.decode(data), { contentType: 'image/svg+xml' })
    const document = dom.window.document
    const svgElement = document.querySelector('svg')
    if (!svgElement) return 'No graph'

    let nodes = svgElement.getElementsByClassName('node clickable')
    for (let node of nodes) {
      let mermaidId = node.id.match(nodeIdPattern)
      if (mermaidId === null) {
        continue
      }
      node.setAttribute('onclick', `getEntity('${mermaidId[1]}')`)
    }

    return decoder.decode(data)
  }
}
