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

  generateHxAttributes(element: Element): Record<string, string> {
    return {
      'hx-get': '/update-layout',
      'hx-target': '#mermaid-output',
      'hx-swap': 'outerHTML',
      'hx-indicator': '#spinner',
      'hx-vals': JSON.stringify({
        highlightNodeId: this.getMermaidIdFromNodeId(element.id),
      }),
    }
  }

  calculateCornerSignPosition(element: Element): { x: number; y: number } {
    const child = element.firstElementChild
    let x = 0,
      y = 0

    if (child?.nodeName === 'rect') {
      // Position based on flowchart diagram
      x = parseFloat(child.getAttribute('x') || '0') + parseFloat(child.getAttribute('width') || '0') - 10
      y = parseFloat(child.getAttribute('y') || '0') + 20
    } else if (child?.nodeName === 'g') {
      // Position based on class diagram
      const transformData = this.extractTransformData(element)
      if (transformData) {
        ;({ x, y } = transformData)
      }
    }
    return { x, y }
  }

  extractTransformData(element: Element): { x: number; y: number } | null {
    const labelGroup = element.querySelector('.label-group.text')
    const membersGroup = element.querySelector('.members-group.text')

    const labelTransform = labelGroup?.getAttribute('transform')
    const membersTransform = membersGroup?.getAttribute('transform')

    if (labelTransform && membersTransform) {
      const extractCoordRegex = /translate\(\s*([-\d.]+)[ ,\s]*([-\d.]+)\s*\)/

      const translateMatch = labelTransform.match(extractCoordRegex)
      if (translateMatch) {
        const [, x, y] = translateMatch.map(parseFloat)
        return { x: x - 10, y: y + 20 }
      }
    }
    return null
  }

  addCornerSign(
    element: Element,
    position: { x: number; y: number },
    document: Document,
    hxAttributes: Record<string, string>
  ): void {
    const { x, y } = position

    const text = document.createElement('text')
    text.setAttribute('x', x.toString())
    text.setAttribute('y', y.toString())
    text.classList.add('corner-sign')
    text.textContent = element.classList.contains('unexpanded') ? '+' : '-'

    const cornerSignAttributes = {
      ...hxAttributes,
      'hx-vals': JSON.stringify({
        shouldExpand: element.classList.contains('unexpanded'),
        shouldTruncate: element.classList.contains('expanded'),
      }),
    }

    text.setAttribute('onclick', 'event.stopPropagation()')
    Object.entries(cornerSignAttributes).forEach(([key, value]) => text.setAttribute(key, value))

    element.appendChild(text)
  }

  setNodeAttributes(element: Element, document: Document) {
    const hxAttributes = this.generateHxAttributes(element)

    Object.entries(hxAttributes).forEach(([key, value]) => element.setAttribute(key, value))

    if (element.classList.contains('unexpanded') || element.classList.contains('expanded')) {
      const position = this.calculateCornerSignPosition(element)
      this.addCornerSign(element, position, document, hxAttributes)
    }
  }

  setSVGAttributes = (svg: string, params: UpdateParams): string => {
    const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
    const document = dom.window.document
    const svgElement = document.querySelector('#mermaid-svg')
    if (!svgElement) throw new InternalError('Error in finding mermaid-svg Element in generated output')

    // remove width and height as these will be done in css
    svgElement.removeAttribute('width')
    svgElement.removeAttribute('height')
    // modify the viewbox to match the available container
    svgElement.setAttribute('viewBox', `0 0 ${params.svgWidth} ${params.svgHeight}`)

    svgElement.setAttribute('hx-include', '#search-panel')
    const nodes = svgElement.getElementsByClassName('node clickable')
    Array.from(nodes).forEach((node) => {
      this.setNodeAttributes(node, document)
    })

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
