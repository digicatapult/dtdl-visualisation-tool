import { singleton } from 'tsyringe'

import { InternalError } from '../../errors.js'
import { type AttributeParams } from '../../models/controllerTypes.js'
import { DtdlModel, type RelationshipEntity } from '../../models/dtdlOmParser.js'
import { type DiagramType } from '../../models/mermaidDiagrams.js'
import { type MermaidSvgRender } from '../../models/renderedDiagram/index.js'
import { type MermaidId } from '../../models/strings.js'
import { getDisplayName, isRelationship } from '../dtdl/extract.js'
import { Session } from '../sessions.js'
import { extractClassNodeCoordinate } from './classDiagram.js'
import { extractFlowchartNodeCoordinates } from './flowchart.js'
import {
  boundingBoxFromBoundary,
  boundingBoxIntersects,
  dtdlIdReplaceSemicolon,
  translateBoundingBox,
  type BoundingBox,
} from './helpers.js'

@singleton()
export class SvgMutator {
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
      'hx-get': 'update-layout',
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
    highlightNodeId?: string
  ) {
    const labelText = [...labelElement.querySelectorAll('.text-inner-tspan')].map((n) => n.innerHTML).join('')
    const relationshipId = relationshipMap.get(`${this.getMermaidIdFromId(lineElement.id, 'edge')}_${labelText}`)

    if (labelText === 'extends') {
      lineElement.setAttribute('extends-edge', '')
      labelElement.setAttribute('extends-edge', '')
    }

    if (!relationshipId) {
      return
    }

    const hxAttributes = this.generateHxAttributes(relationshipId)
    Object.entries(hxAttributes).forEach(([key, value]) => {
      labelElement.setAttribute(key, value)
    })

    labelElement.setAttribute('clickable', '')
    if (relationshipId === highlightNodeId) {
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

  setSVGAttributes(svg: MermaidSvgRender, model: DtdlModel, params: AttributeParams): void {
    // mermaid sets some default styles on the svg that are unhelpful for resizing. Remove them
    svg.svgElement.removeAttribute('style')
    // set height and width explicitly so the element is sized correctly
    svg.svgElement.setAttribute('width', `${params.svgWidth}`)
    svg.svgElement.setAttribute('height', `${params.svgHeight}`)

    // modify the viewbox to match the available container
    svg.svgElement.setAttribute('viewBox', `0 0 ${params.svgWidth} ${params.svgHeight}`)
    svg.svgElement.setAttribute('hx-include', '#sessionId, #search-panel, input[name="navigationPanelTab"]')

    // mutate nodes to make them clickable and styled correctly
    svg.mapGraphNodes((node) => {
      this.setNodeAttributes(node, svg.document, params.diagramType, params.highlightNodeId)
    })
    // re-order nodes after edges so that the path fill doesn't overlap clickable nodes
    svg.nodesElement.parentNode?.appendChild(svg.nodesElement)

    // create a map from the inner of the id generated by mermaid to the id of the relationship in the model
    const relationshipMap = new Map(
      Object.values(model)
        .filter(isRelationship)
        .filter(
          (entity): entity is RelationshipEntity & { ChildOf: string; target: string } =>
            typeof entity.ChildOf === 'string' && typeof entity.target === 'string'
        )
        .map((entity) => {
          const key = [
            dtdlIdReplaceSemicolon(entity.ChildOf),
            dtdlIdReplaceSemicolon(entity.target),
            getDisplayName(entity),
          ].join('_')
          return [key, entity.Id] as const
        })
    )
    // mutate edges to make them clickable and styled accordingly
    svg.mapGraphEdges((edge, label) => this.setEdgeAttributes(edge, label, relationshipMap, params.highlightNodeId))
  }

  extractBoundingBox = (diagramType: DiagramType) => {
    const coordExtractor = this.coordinateExtractors[diagramType]
    return (element: Element) => {
      return coordExtractor(element)
    }
  }

  buildElementMap(render: MermaidSvgRender) {
    const map = render
      .mapGraphNodes((el) => {
        const mermaidId = this.getMermaidIdFromId(el.id, 'node')
        return mermaidId ? ([mermaidId, el] as const) : null
      })
      .filter((x) => !!x)
    return new Map(map)
  }

  createRevealAnimation(render: MermaidSvgRender) {
    const revealAnimation = render.document.createElement('animate')
    revealAnimation.setAttribute('attributeName', 'opacity')
    revealAnimation.setAttribute('from', '0')
    revealAnimation.setAttribute('to', '1')
    revealAnimation.setAttribute('dur', '200ms')
    revealAnimation.setAttribute('begin', '500ms')
    revealAnimation.setAttribute('fill', 'freeze')
    return revealAnimation
  }

  createAnimateTransform(render: MermaidSvgRender, initialX: number, initialY: number) {
    const animateTransform = render.document.createElement('animateTransform')
    animateTransform.setAttribute('attributeName', 'transform')
    animateTransform.setAttribute('type', 'translate')
    animateTransform.setAttribute('additive', 'sum')
    animateTransform.setAttribute('from', `${initialX},${initialY}`)
    animateTransform.setAttribute('to', '0,0')
    animateTransform.setAttribute('dur', '500ms')
    animateTransform.setAttribute('fill', 'freeze')
    return animateTransform
  }

  applyRevealAnimation(element: Element, revealAnimation: Element) {
    element.setAttribute('opacity', '0')
    element.appendChild(revealAnimation.cloneNode())
  }

  setupAnimations(
    newSession: Session,
    newOutput: MermaidSvgRender,
    oldOutput: MermaidSvgRender,
    currentZoom: number,
    currentPanX: number,
    currentPanY: number,
    svgWidth: number,
    svgHeight: number
  ) {
    // calculate the coordinates of the viewport in svg space
    const viewportLeft = -1 * (currentPanX / currentZoom)
    const viewportRight = (svgWidth - currentPanX) / currentZoom
    const viewportTop = -1 * (currentPanY / currentZoom)
    const viewportBottom = (svgHeight - currentPanY) / currentZoom
    const viewport = boundingBoxFromBoundary(viewportLeft, viewportRight, viewportTop, viewportBottom)

    const newNodesMap = this.buildElementMap(newOutput)
    const oldNodesMap = this.buildElementMap(oldOutput)

    const nodesList = Array.from(newNodesMap).map(([id, newNode]) => {
      const oldNode = oldNodesMap.get(id)
      const oldBoundingBox = oldNode && this.extractBoundingBox(newSession.diagramType)(oldNode)
      const newBoundingBox = this.extractBoundingBox(newSession.diagramType)(newNode)
      return { mermaidId: id, newNode, oldNode, newBoundingBox, oldBoundingBox }
    })

    const panDiffCalc = nodesList.reduce(
      (acc, { oldNode, newBoundingBox, oldBoundingBox }) => {
        if (!oldNode || !oldBoundingBox || !boundingBoxIntersects(oldBoundingBox, viewport)) {
          return acc
        }
        return {
          oldVisibleNodeCount: acc.oldVisibleNodeCount + 1,
          x: acc.x + oldBoundingBox.x - newBoundingBox.x,
          y: acc.y + oldBoundingBox.y - newBoundingBox.y,
        }
      },
      { x: 0, y: 0, oldVisibleNodeCount: 0 }
    )

    if (panDiffCalc.oldVisibleNodeCount === 0) {
      return {
        zoom: 1,
        pan: { x: 0, y: 0 },
      }
    }

    const panX = -panDiffCalc.x / panDiffCalc.oldVisibleNodeCount
    const panY = -panDiffCalc.y / panDiffCalc.oldVisibleNodeCount
    const newViewport = translateBoundingBox(viewport, panX, panY)

    const revealAnimation = this.createRevealAnimation(newOutput)

    // hide the edges and labels with the reveal animation
    this.applyRevealAnimation(newOutput.edgesElement, revealAnimation)
    this.applyRevealAnimation(newOutput.edgeLabelsElement, revealAnimation)

    nodesList.forEach(({ newNode, oldNode, newBoundingBox, oldBoundingBox }) => {
      if (!boundingBoxIntersects(newBoundingBox, newViewport)) {
        return
      }

      if (!oldNode || !oldBoundingBox) {
        this.applyRevealAnimation(newNode, revealAnimation)
        return
      }

      const animateTransform = this.createAnimateTransform(
        newOutput,
        oldBoundingBox.x - newBoundingBox.x + panX,
        oldBoundingBox.y - newBoundingBox.y + panY
      )
      newNode.appendChild(animateTransform)
    })

    return {
      zoom: currentZoom,
      pan: {
        x: currentPanX - panX * currentZoom,
        y: currentPanY - panY * currentZoom,
      },
    }
  }
}
