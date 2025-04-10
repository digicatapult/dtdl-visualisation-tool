import { JSDOM } from 'jsdom'

import { InternalError } from '../../errors.js'
import { RenderedDiagram } from './base.js'

export class MermaidSvgRender extends RenderedDiagram<'svg'> {
  private jsdom: JSDOM
  private minimapDom: JSDOM
  private svg: Element
  private svgRawWidth: number | null
  private svgRawHeight: number | null
  private minimapSvg: Element
  private nodesParent: Element
  private edgesParent: Element
  private edgeLabelsParent: Element

  get type() {
    return 'svg' as const
  }
  get document() {
    return this.jsdom.window.document
  }
  get svgElement() {
    return this.svg
  }
  get nodesElement() {
    return this.nodesParent
  }
  get edgesElement() {
    return this.edgesParent
  }
  get edgeLabelsElement() {
    return this.edgeLabelsParent
  }
  get svgRawSize() {
    return this.svgRawWidth && this.svgRawHeight ? { width: this.svgRawWidth, height: this.svgRawHeight } : null
  }

  constructor(svgBuffer: Buffer) {
    super()

    try {
      this.jsdom = new JSDOM(svgBuffer, { contentType: 'image/svg+xml' })
      this.minimapDom = new JSDOM(svgBuffer, { contentType: 'image/svg+xml' })
    } catch (err) {
      throw new InternalError(`Error parsing svg ${err}`)
    }

    const keyElements = this.validateSvg(this.jsdom)
    this.svg = keyElements.svg

    const maybeViewBox = this.svg.getAttribute('viewBox')?.split(/\s+/).map(parseFloat)
    this.svgRawWidth = maybeViewBox?.length === 4 ? maybeViewBox[2] : null
    this.svgRawHeight = maybeViewBox?.length === 4 ? maybeViewBox[3] : null

    this.nodesParent = keyElements.nodes
    this.edgesParent = keyElements.edges
    this.edgeLabelsParent = keyElements.edgeLabels

    this.minimapSvg = this.validateSvg(this.minimapDom).svg
  }

  renderToString() {
    return this.svg.outerHTML
  }

  renderForMinimap() {
    return this.minimapSvg.outerHTML
  }

  mapGraphNodes<T>(fn: (node: Element, index: number, render: MermaidSvgRender) => T) {
    return Array.from(this.nodesParent.children).map((el, i) => fn(el, i, this))
  }

  mapGraphEdges<T>(fn: (edge: Element, edgeLabel: Element, index: number, render: MermaidSvgRender) => T) {
    return Array.from(this.edgesParent.children).map((el, i) => fn(el, this.edgeLabelsParent.children[i], i, this))
  }

  private validateSvg(jsdom: JSDOM) {
    const document = jsdom.window.document
    const svg = document.getElementsByTagName('svg')[0]
    const nodes = svg.querySelector('g.nodes')
    if (nodes === null) {
      throw new InternalError('Error finding nodes in MermaidSVG')
    }

    const edges = svg.querySelector('g.edges, g.edgePaths')
    const edgeLabels = svg.querySelector('g.edgeLabels')
    if (!edges || !edgeLabels) {
      throw new InternalError('Error finding edges in MermaidSVG')
    }
    if (edges.childElementCount !== edgeLabels.childElementCount) {
      throw new InternalError(
        `Expected edge count (${edges.childElementCount}) to equal edge label count (${edgeLabels.childElementCount})`
      )
    }

    return {
      svg,
      nodes,
      edges,
      edgeLabels,
    }
  }
}
