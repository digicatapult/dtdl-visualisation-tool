import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { JSDOM } from 'jsdom'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { InternalError } from '../../errors.js'
import { UpdateParams } from '../../models/controllerTypes.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { Layout } from '../../models/mermaidLayouts.js'
import { MermaidId } from '../../models/strings.js'
import { Session } from '../sessions.js'
import ClassDiagram, { extractClassNodeCoordinate } from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart, { extractFlowchartNodeCoordinates } from './flowchart.js'

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
  coordinateExtractors = {
    flowchart: extractFlowchartNodeCoordinates,
    classDiagram: extractClassNodeCoordinate,
  } satisfies Record<DiagramType, Function>

  private nodeIdPattern = /^[^-]+-(.+)-\d+$/
  getMermaidIdFromNodeId = (nodeId: string): MermaidId | null => {
    const mermaidId = nodeId.match(this.nodeIdPattern)
    return mermaidId === null ? mermaidId : mermaidId[1]
  }

  generateHxAttributes(element: Element): Record<string, string> {
    return {
      'hx-get': '/update-layout',
      'hx-target': '#mermaid-output',
      'hx-swap': 'outerHTML transition:true',
      'hx-indicator': '#spinner',
      'hx-vals': JSON.stringify({
        highlightNodeId: this.getMermaidIdFromNodeId(element.id),
      }),
    }
  }

  addCornerSign(
    element: Element,
    size: { width: number; height: number },
    document: Document,
    hxAttributes: Record<string, string>
  ): void {
    const { width, height } = size

    const text = document.createElement('text')
    text.setAttribute('x', (width / 2 - 5).toString())
    text.setAttribute('y', (20 - height / 2).toString())
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

  setNodeAttributes(element: Element, document: Document, diagramType: DiagramType, highlightNodeId?: string) {
    const hxAttributes = this.generateHxAttributes(element)

    Object.entries(hxAttributes).forEach(([key, value]) => element.setAttribute(key, value))

    if (element.classList.contains('unexpanded') || element.classList.contains('expanded')) {
      const position = this.coordinateExtractors[diagramType](element)
      this.addCornerSign(element, position, document, hxAttributes)
    }

    if (highlightNodeId && this.getMermaidIdFromNodeId(element.id) === highlightNodeId) {
      element.setAttribute('highlighted', '')
    }
  }

  setSVGAttributes(
    svg: string,
    params: Pick<UpdateParams, 'svgWidth' | 'svgHeight' | 'highlightNodeId' | 'diagramType'>
  ): string {
    const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
    const document = dom.window.document
    const svgElement = document.getElementById('mermaid-svg')
    if (!svgElement) throw new InternalError('Error in finding mermaid-svg Element in generated output')

    // mermaid sets some default styles on the svg that are unhelpful for resizing. Remove them
    svgElement.removeAttribute('style')
    // set height and width explicitly so the element is sized correctly
    svgElement.setAttribute('width', `${params.svgWidth}`)
    svgElement.setAttribute('height', `${params.svgHeight}`)

    // modify the viewbox to match the available container
    svgElement.setAttribute('viewBox', `0 0 ${params.svgWidth} ${params.svgHeight}`)

    svgElement.setAttribute('hx-include', '#search-panel')
    const nodes = svgElement.getElementsByClassName('node')

    Array.from(nodes).forEach((node) => {
      this.setNodeAttributes(node, document, params.diagramType, params.highlightNodeId)
    })

    return svgElement.outerHTML
  }

  setupAnimations(
    newSession: Session,
    newOutput: string,
    oldOutput: string,
    currentZoom: number,
    currentPanX: number,
    currentPanY: number,
    svgWidth: number,
    svgHeight: number
  ) {
    // next we need to parse the two svgs into JSDom
    const oldDom = new JSDOM(oldOutput, { contentType: 'image/svg+xml' })
    const oldDocument = oldDom.window.document

    const newDom = new JSDOM(newOutput, { contentType: 'image/svg+xml' })
    const newDocument = newDom.window.document
    const newSvgElement = newDocument.getElementById('mermaid-svg')
    if (!newSvgElement) throw new InternalError('Error in finding mermaid-svg Element in generated output')

    // calculate the coordinates of the viewport in svg space
    const viewportLeft = -1 * (currentPanX / currentZoom)
    const viewportRight = (svgWidth - currentPanX) / currentZoom
    const viewportTop = -1 * (currentPanY / currentZoom)
    const viewportBottom = (svgHeight - currentPanY) / currentZoom
    const viewport = {
      left: viewportLeft,
      right: viewportRight,
      top: viewportTop,
      bottom: viewportBottom,
      width: viewportRight - viewportLeft,
      height: viewportBottom - viewportTop,
      x: viewportLeft + 0.5 * viewportRight,
      y: viewportTop + 0.5 * viewportBottom,
    }

    const coordExtractor = this.coordinateExtractors[newSession.diagramType]
    const newNodesMap = new Map(
      Array.from(newDocument.getElementsByClassName('node'))
        .map((element) => {
          const mermaidId = this.getMermaidIdFromNodeId(element.id)
          if (!mermaidId) {
            return null
          }
          const boundingBox = coordExtractor(element)
          return [mermaidId, { element, boundingBox }] as const
        })
        .filter((x) => !!x)
    )
    const visibleOldNodes = new Map(
      Array.from(oldDocument.getElementsByClassName('node'))
        .map((element) => {
          const boundingBox = coordExtractor(element)
          if (
            boundingBox.right < viewport.left ||
            boundingBox.left > viewport.right ||
            boundingBox.top > viewport.bottom ||
            boundingBox.bottom < viewport.top
          ) {
            return null
          }
          const mermaidId = this.getMermaidIdFromNodeId(element.id)
          if (!mermaidId) {
            return null
          }

          return [mermaidId, { element, boundingBox }] as const
        })
        .filter((x) => !!x)
        .filter(([id]) => newNodesMap.has(id))
    )

    if (visibleOldNodes.size === 0) {
      return {
        generatedOutput: newOutput,
        zoom: 1,
        pan: { x: 0, y: 0 },
      }
    }

    let panChange: { x: number; y: number }
    if (newSession.highlightNodeId && visibleOldNodes.has(newSession.highlightNodeId)) {
      // get the pan required for the highlighted node to stay stationary in the new svg
      const oldHighlightedNode = visibleOldNodes.get(newSession.highlightNodeId)
      const newHighlightedNode = newNodesMap.get(newSession.highlightNodeId)
      if (!newHighlightedNode || !oldHighlightedNode) {
        throw new Error()
      }

      panChange = {
        x: oldHighlightedNode.boundingBox.x - newHighlightedNode.boundingBox.x,
        y: oldHighlightedNode.boundingBox.y - newHighlightedNode.boundingBox.y,
      }
    } else {
      const count = visibleOldNodes.size
      const centersOfMass = Array.from(visibleOldNodes).reduce(
        (acc, [id, { boundingBox: oldBoundingBox }]) => {
          const newBoundingBox = newNodesMap.get(id)?.boundingBox
          if (!newBoundingBox) throw new InternalError(`Expected node ${id} to exist in new nodes set`)
          acc.oldCoM.x += oldBoundingBox.x / count
          acc.oldCoM.y += oldBoundingBox.y / count
          acc.newCoM.x += newBoundingBox.x / count
          acc.newCoM.y += newBoundingBox.y / count
          return acc
        },
        { oldCoM: { x: 0, y: 0 }, newCoM: { x: 0, y: 0 } }
      )

      panChange = {
        x: centersOfMass.oldCoM.x - centersOfMass.newCoM.x,
        y: centersOfMass.oldCoM.y - centersOfMass.newCoM.y,
      }
    }

    const newViewportLeft = -1 * (panChange.x + currentPanX / currentZoom)
    const newViewportRight = (svgWidth - currentPanX) / currentZoom - panChange.x
    const newViewportTop = -1 * (panChange.y + currentPanY / currentZoom)
    const newViewportBottom = (svgHeight - currentPanY) / currentZoom - panChange.y
    const newViewport = {
      left: newViewportLeft,
      right: newViewportRight,
      top: newViewportTop,
      bottom: newViewportBottom,
      width: newViewportRight - newViewportLeft,
      height: newViewportBottom - newViewportTop,
      x: newViewportLeft + 0.5 * newViewportRight,
      y: newViewportTop + 0.5 * newViewportBottom,
    }

    const revealAnimation = newDocument.createElement('animate')
    revealAnimation.setAttribute('attributeName', 'opacity')
    revealAnimation.setAttribute('from', '0')
    revealAnimation.setAttribute('to', '1')
    revealAnimation.setAttribute('dur', '200ms')
    revealAnimation.setAttribute('begin', '500ms')
    revealAnimation.setAttribute('fill', 'freeze')

    // hide the edges and labels with the reveal animation
    newSvgElement.getElementsByClassName('edges')
    newSvgElement.getElementsByClassName('edgeLabels')
    Array.from([
      Array.from(newSvgElement.getElementsByClassName('edges')),
      Array.from(newSvgElement.getElementsByClassName('edgeLabels')),
    ])
      .flat()
      .forEach((element) => {
        element.setAttribute('opacity', '0')
        element.appendChild(revealAnimation.cloneNode())
      })

    Array.from(newNodesMap).forEach(([id, { element: newElement, boundingBox: newBoundingBox }]) => {
      if (id === newSession.highlightNodeId) {
        return
      }

      if (
        newBoundingBox.right < newViewport.left ||
        newBoundingBox.left > newViewport.right ||
        newBoundingBox.top > newViewport.bottom ||
        newBoundingBox.bottom < newViewport.top
      ) {
        return
      }

      const oldNode = visibleOldNodes.get(id)
      if (!oldNode) {
        newElement.setAttribute('opacity', '0')
        newElement.appendChild(revealAnimation.cloneNode())
        return
      }

      const animateTransform = newDocument.createElement('animateTransform')
      animateTransform.setAttribute('attributeName', 'transform')
      animateTransform.setAttribute('type', 'translate')
      animateTransform.setAttribute('additive', 'sum')
      animateTransform.setAttribute(
        'from',
        `${oldNode.boundingBox.x - newBoundingBox.x - panChange.x},${oldNode.boundingBox.y - newBoundingBox.y - panChange.y}`
      )
      animateTransform.setAttribute('to', '0,0')
      animateTransform.setAttribute('dur', '500ms')
      animateTransform.setAttribute('fill', 'freeze')
      newElement.appendChild(animateTransform)
    })

    return {
      generatedOutput: newSvgElement.outerHTML,
      zoom: currentZoom,
      pan: {
        x: currentPanX + panChange.x * currentZoom,
        y: currentPanY + panChange.y * currentZoom,
      },
    }
  }

  async run(
    dtdlObject: DtdlObjectModel,
    diagramType: DiagramType,
    layout: Layout,
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
          layout,
        },
      }

      const graph = this.mermaidMarkdownByDiagramType[diagramType].generateMarkdown(dtdlObject, ' TD')
      if (!graph) return 'No graph'

      const { data } = await renderMermaid(await this.browser, graph, 'svg', parseMDDOptions)
      const decoder = new TextDecoder()

      if (!decoder.decode(data)) return 'No SVG generated'

      return decoder.decode(data)
    } catch (err) {
      log('Something went wrong rendering mermaid layout', err)
      if (!isRetry) {
        log('Attempting to relaunch puppeteer')

        const oldBrowser = await this.browser
        await oldBrowser.close()

        this.browser = puppeteer.launch({})
        return this.run(dtdlObject, diagramType, layout, options, true)
      }
      throw err
    }
  }
}
