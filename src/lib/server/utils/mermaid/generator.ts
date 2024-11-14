import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { JSDOM } from 'jsdom'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { QueryParams } from '../../models/controllerTypes.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { MermaidId } from '../../models/strings.js'
import ClassDiagram from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart from './flowchart.js'

@singleton()
export class SvgGenerator {
  public browser: Promise<Browser>
  constructor() {
    this.browser = puppeteer.launch({ headless: true })
  }

  mermaidMarkdownByDiagramType: {
    [k in DiagramType]: IDiagram<k>
  } = {
    flowchart: new Flowchart(),
    classDiagram: new ClassDiagram(),
  }

  getMermaidIdFromNodeId = (nodeId: string): MermaidId | null => {
    const nodeIdPattern = /^[^-]+-(.+)-\d+$/
    const mermaidId = nodeId.match(nodeIdPattern)
    return mermaidId === null ? mermaidId : mermaidId[1]
  }

  setNodeAttributes = (element: Element) => {
    const attributes = {
      'hx-get': '/update-layout',
      'hx-target': '#mermaid-output',
      'hx-vals': `${JSON.stringify({
        highlightNodeId: this.getMermaidIdFromNodeId(element.id),
        shouldExpand: element.classList.contains('unexpanded'),
      })}`,
    }
    Object.keys(attributes).forEach((key) => element.setAttribute(key, attributes[key]))
  }

  setSVGAttributes = (svg: string): string => {
    const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
    const document = dom.window.document
    const svgElement = document.querySelector('svg')
    if (!svgElement) return 'No svg element found'

    svgElement.setAttribute('hx-include', '#search-panel')
    const nodes = svgElement.getElementsByClassName('node clickable')
    Array.from(nodes).forEach((node) => this.setNodeAttributes(node))

    return svgElement.outerHTML
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

    return this.setSVGAttributes(decoder.decode(data))
  }
}
