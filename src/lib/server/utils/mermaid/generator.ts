import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { JSDOM } from 'jsdom'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { InternalError } from '../../errors.js'
import { QueryParams } from '../../models/controllerTypes.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { MermaidId } from '../../models/strings.js'
import ClassDiagram from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart from './flowchart.js'
import { setElementAttributes } from './helpers.js'

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

  getMermaidIdFromNodeId = (nodeId: string): MermaidId | null => {
    const nodeIdPattern = /^[^-]+-(.+)-\d+$/
    const mermaidId = nodeId.match(nodeIdPattern)
    return mermaidId === null ? mermaidId : mermaidId[1]
  }

  setSVGAttributes = (svg: string): string => {
    const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
    const document = dom.window.document
    const svgElement = document.querySelector('#mermaid-svg')
    if (!svgElement) throw new InternalError('Error in finding mermaid-svg Element in generated output')

    setElementAttributes(svgElement, {
      'hx-include': '#search-panel',
      'hx-indicator': '.htmx-indicator'
    })

    const nodes = svgElement.getElementsByClassName('node clickable')
    Array.from(nodes).forEach((node) => {

      const attributes = {
        'hx-get': '/update-layout',
        'hx-target': '#mermaid-output',
        'hx-indicator': '.htmx-indicator',
        'hx-vals': `${JSON.stringify({
          highlightNodeId: this.getMermaidIdFromNodeId(node.id),
          shouldExpand: node.classList.contains('unexpanded'),
          shouldTruncate: node.classList.contains('expanded')
        })}`,
      }
      setElementAttributes(node, attributes)
    })

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
        securityLevel: 'strict',
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

    if (!decoder.decode(data)) return 'No SVG generated'

    return this.setSVGAttributes(decoder.decode(data))
  }
}
