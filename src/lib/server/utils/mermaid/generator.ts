import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { JSDOM } from 'jsdom'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { InternalError } from '../../errors.js'
import { UpdateParams } from '../../models/controllerTypes.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { MermaidId } from '../../models/strings.js'
import ClassDiagram from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart from './flowchart.js'

const { log } = console

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

  setNodeAttributes = (element: Element) => {
    const attributes = {
      'hx-get': '/update-layout',
      'hx-target': '#mermaid-output',
      'hx-swap': 'outerHTML',
      'hx-indicator': '#spinner',
      'hx-vals': `${JSON.stringify({
        highlightNodeId: this.getMermaidIdFromNodeId(element.id),
        shouldExpand: element.classList.contains('unexpanded'),
      })}`,
    }
    Object.keys(attributes).forEach((key) => element.setAttribute(key, attributes[key]))
  }

  setSVGAttributes = (svg: string, params: UpdateParams): string => {
    const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
    const document = dom.window.document
    const svgElement = document.querySelector('#mermaid-svg')
    if (!svgElement) throw new InternalError('Error in finding mermaid-svg Element in generated output')

    // remove width and height as these will be done in css
    svgElement.removeAttribute('width')
    svgElement.removeAttribute('height')
    svgElement.setAttribute('viewBox', `0 0 ${params.svgWidth} ${params.svgHeight}`)

    // modify the viewbox to match the

    svgElement.setAttribute('hx-include', '#search-panel')
    const nodes = svgElement.getElementsByClassName('node clickable')
    Array.from(nodes).forEach((node) => this.setNodeAttributes(node))

    return svgElement.outerHTML
  }

  async run(
    dtdlObject: DtdlObjectModel,
    params: UpdateParams,
    options: ParseMDDOptions = {},
    isRetry: boolean = false
  ): Promise<string> {
    try {
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

      return this.setSVGAttributes(decoder.decode(data), params)
    } catch (err) {
      log('Something went wrong rendering mermaid layout', err)
      if (!isRetry) {
        log('Attempting to relaunch puppeteer')

        const oldBrowser = await this.browser
        await oldBrowser.close()

        this.browser = puppeteer.launch({})
        return this.run(dtdlObject, params, options, true)
      }
      throw err
    }
  }
}
