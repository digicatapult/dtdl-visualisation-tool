import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { JSDOM } from 'jsdom'
import puppeteer, { Browser } from 'puppeteer'
import { inject, singleton } from 'tsyringe'
import { z } from 'zod'

import { InternalError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import { UpdateParams } from '../../models/controllerTypes.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { Layout } from '../../models/mermaidLayouts.js'
import { MermaidId } from '../../models/strings.js'
import { Session } from '../sessions.js'
import ClassDiagram, { extractClassNodeCoordinate } from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart, { extractFlowchartNodeCoordinates } from './flowchart.js'
import { BoundingBox, dtdlIdReplaceSemicolon } from './helpers.js'

export const generateResultParser = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    content: z.string(),
  }),
  z.object({
    type: z.literal('svg'),
    content: z.string(),
  }),
])
export type GenerateResult = z.infer<typeof generateResultParser>

@singleton()
export class SvgGenerator {
  public browser: Promise<Browser>
  constructor(@inject(Logger) private logger: ILogger) {
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
  } satisfies Record<DiagramType, (el: Element) => BoundingBox>

  private nodeIdPattern = /^[^-]+-(.+)-\d+$/
  private edgePattern = /^[^_]+_(.*?)(?:_\d+)+$/
  getMermaidIdFromId = (nodeId: string, elementType: 'node' | 'edge'): MermaidId | null => {
    const mermaidId = nodeId.match(elementType === 'node' ? this.nodeIdPattern : this.edgePattern)
    return mermaidId === null ? mermaidId : mermaidId[1]
  }

  generateHxAttributes(highlightNodeId: string): Record<string, string> {
    return {
      'hx-get': '/update-layout',
      'hx-target': '#mermaid-output',
      'hx-swap': 'outerHTML transition:true',
      'hx-indicator': '#spinner',
      'hx-vals': JSON.stringify({
        highlightNodeId,
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
    const id = this.getMermaidIdFromId(element.id, 'node')
    if (!id) {
      return
    }

    const hxAttributes = this.generateHxAttributes(id)

    Object.entries(hxAttributes).forEach(([key, value]) => element.setAttribute(key, value))

    if (element.classList.contains('unexpanded') || element.classList.contains('expanded')) {
      const position = this.coordinateExtractors[diagramType](element)
      this.addCornerSign(element, position, document, hxAttributes)
    }

    if (id === highlightNodeId) {
      element.setAttribute('highlighted', '')
    }
  }

  setEdgeAttributes(
    lineElement: Element,
    labelElement: Element,
    relationshipMap: Map<string, string>,
    highlighNodeId?: string
  ) {
    const labelText = labelElement.querySelector('.text-inner-tspan')?.innerHTML
    const relationshipId = relationshipMap.get(`${this.getMermaidIdFromId(lineElement.id, 'edge')}_${labelText}`)

    if (!relationshipId) {
      return
    }

    const hxAttributes = this.generateHxAttributes(relationshipId)
    Object.entries(hxAttributes).forEach(([key, value]) => {
      labelElement.setAttribute(key, value)
    })

    labelElement.setAttribute('clickable', '')
    if (relationshipId === highlighNodeId) {
      lineElement.setAttribute('highlighted', '')
      labelElement.setAttribute('highlighted', '')
    }
  }

  getSvgGraphElements(svgElement: Element, elementType: 'nodes' | 'edges' | 'edgeLabels' | 'edgePaths') {
    const query = `g.${elementType}`
    const parent = svgElement.querySelector(query)

    if (!parent) {
      throw new InternalError(`Expected there to be an element in the SVG that satisfies the query ${query}`)
    }

    return parent
  }

  setSVGAttributes(
    svg: string,
    model: DtdlObjectModel,
    params: Pick<UpdateParams, 'svgWidth' | 'svgHeight' | 'highlightNodeId' | 'diagramType' | 'layout'>
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

    // mutate nodes to make them clickable and styled correctly
    const nodes = this.getSvgGraphElements(svgElement, 'nodes')
    Array.from(nodes.children).forEach((node) => {
      this.setNodeAttributes(node, document, params.diagramType, params.highlightNodeId)
    })
    // re-order nodes after edges so that the path fill doesn't overlap clickable nodes
    nodes.parentNode?.appendChild(nodes)

    // mutate edges to make them clickable and styled accordingly
    const edges = this.getSvgGraphElements(svgElement, params.layout === 'elk' ? 'edges' : 'edgePaths')
    const edgeLabels = this.getSvgGraphElements(svgElement, 'edgeLabels')
    const relationshipMap = new Map(
      Object.values(model)
        .map((entity) => {
          if (entity.EntityKind !== 'Relationship' || !('target' in entity) || !entity.ChildOf || !entity.target) {
            return null
          }
          return [
            [dtdlIdReplaceSemicolon(entity.ChildOf), dtdlIdReplaceSemicolon(entity.target), entity.name].join('_'),
            entity.Id,
          ] as const
        })
        .filter((x) => !!x)
    )
    Array.from(edges.children).forEach((edge, i) => {
      const label = edgeLabels.children[i]
      this.setEdgeAttributes(edge, label, relationshipMap, params.highlightNodeId)
    })

    return svgElement.outerHTML
  }

  buildElementMap(
    diagramType: DiagramType,
    nodes: ArrayLike<Element>
  ): Map<string, { element: Element; boundingBox: BoundingBox }> {
    const coordExtractor = this.coordinateExtractors[diagramType]
    return new Map(
      Array.from(nodes)
        .map((element) => {
          const mermaidId = this.getMermaidIdFromId(element.id, 'node')
          if (!mermaidId) {
            return null
          }
          const boundingBox = coordExtractor(element)
          return [mermaidId, { element, boundingBox }] as const
        })
        .filter((x) => !!x)
    )
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

    const newNodesMap = this.buildElementMap(newSession.diagramType, newDocument.getElementsByClassName('node'))
    const oldNodesMap = this.buildElementMap(newSession.diagramType, oldDocument.getElementsByClassName('node'))
    const visibleOldNodes = new Set(
      Array.from(oldNodesMap)
        .filter(([id, { boundingBox }]) => {
          return (
            boundingBox.right > viewport.left &&
            boundingBox.left < viewport.right &&
            boundingBox.bottom > viewport.top &&
            boundingBox.top < viewport.bottom &&
            newNodesMap.has(id)
          )
        })
        .map(([id]) => id)
    )

    if (visibleOldNodes.size === 0) {
      return {
        generatedOutput: newOutput,
        zoom: 1,
        pan: { x: 0, y: 0 },
      }
    }

    const count = visibleOldNodes.size
    const panChange = Array.from(visibleOldNodes).reduce(
      (acc, id) => {
        const oldBoundingBox = oldNodesMap.get(id)?.boundingBox
        const newBoundingBox = newNodesMap.get(id)?.boundingBox

        if (!newBoundingBox || !oldBoundingBox)
          throw new InternalError(`Expected node ${id} to exist in new and old nodes`)

        return {
          x: acc.x + (oldBoundingBox.x - newBoundingBox.x) / count,
          y: acc.y + (oldBoundingBox.y - newBoundingBox.y) / count,
        }
      },
      { x: 0, y: 0 }
    )

    const newViewport = {
      left: viewport.left - panChange.x,
      right: viewport.right - panChange.x,
      top: viewport.top - panChange.y,
      bottom: viewport.bottom - panChange.y,
      width: viewport.width,
      height: viewport.height,
      x: viewport.x - panChange.x,
      y: viewport.y - panChange.y,
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
      if (
        newBoundingBox.right < newViewport.left ||
        newBoundingBox.left > newViewport.right ||
        newBoundingBox.top > newViewport.bottom ||
        newBoundingBox.bottom < newViewport.top
      ) {
        return
      }

      const oldNode = visibleOldNodes.has(id) && oldNodesMap.get(id)
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
  ): Promise<GenerateResult> {
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
      if (!graph) {
        return {
          type: 'text',
          content: 'No graph',
        }
      }

      const { data } = await renderMermaid(await this.browser, graph, 'svg', parseMDDOptions)
      const decoder = new TextDecoder()

      if (!decoder.decode(data)) {
        return {
          type: 'text',
          content: 'No SVG generated',
        }
      }

      return {
        type: 'svg',
        content: decoder.decode(data),
      }
    } catch (err) {
      this.logger.warn('Something went wrong rendering mermaid layout', err)
      if (!isRetry) {
        this.logger.info('Attempting to relaunch puppeteer')

        const oldBrowser = await this.browser
        await oldBrowser.close()

        this.browser = puppeteer.launch({})
        return this.run(dtdlObject, diagramType, layout, options, true)
      }
      this.logger.error('Something went wrong rendering mermaid layout', err)
      throw err
    }
  }
}
