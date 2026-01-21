import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { describe, it } from 'mocha'
import { defaultParams } from '../../../controllers/__tests__/root.test'
import { MermaidSvgRender } from '../../../models/renderedDiagram'
import { SvgMutator } from '../svgMutator.js'
import {
  mockDtdlObjectModel,
  svgSearchFuelType,
  svgSearchFuelTypeExpandedFossilFuel,
  svgSearchNuclear,
  withAnimationsOutputFixture,
} from './fixtures'

describe('Generator', function () {
  const mutator = new SvgMutator()

  describe('getMermaidIdFromNodeId', () => {
    it('should return a mermaidId from a svg node id', () => {
      const svgNodeId = 'flowchart-dtmi:com:example:1-1'
      expect(mutator.getMermaidIdFromId(svgNodeId, 'node')).to.equal('dtmi:com:example:1')
    })
    it('should return a null from a string that does not match the node regex pattern', () => {
      const nonMatchingString = 'dtmi:com:example:1'
      expect(mutator.getMermaidIdFromId(nonMatchingString, 'node')).to.equal(null)
    })
    it('should return a mermaidId from a svg edge id', () => {
      const svgNodeId = 'test_edge_id_0_1_2_345'
      expect(mutator.getMermaidIdFromId(svgNodeId, 'edge')).to.equal('edge_id')
    })
    it('should return a null from a string that does not match the edge regex pattern', () => {
      const nonMatchingString = 'dtmi:com:example:1'
      expect(mutator.getMermaidIdFromId(nonMatchingString, 'edge')).to.equal(null)
    })
  })
  describe('setNodeAttributes', () => {
    let dom: JSDOM, document: Document

    beforeEach(() => {
      dom = new JSDOM()
      document = dom.window.document
    })

    it('should return an element with htmx attributes', () => {
      const element = document.createElement('div')
      const rectElement = document.createElement('rect')
      rectElement.setAttribute('width', '50')
      rectElement.setAttribute('height', '25')

      element.id = 'flowchart-dtmi:com:example:1-1'
      element.setAttribute('transform', 'translate(100, 50)')
      element.appendChild(rectElement)
      element.classList.add('unexpanded')

      mutator.setNodeAttributes(element, document, 'flowchart')

      expect(element.getAttribute('hx-get')).to.equal('update-layout')
      expect(element.getAttribute('hx-target')).to.equal('#mermaid-output')

      const hxVals = {
        ...JSON.parse(element.getAttribute('hx-vals') ?? ''),
        ...JSON.parse(element.querySelector('text')?.getAttribute('hx-vals') ?? ''),
      }

      expect(hxVals.highlightNodeId).to.equal('dtmi:com:example:1')
      expect(hxVals.shouldExpand).to.equal(true)
      expect(hxVals.shouldTruncate).to.equal(false)
    })

    it('should not set htmx attributes if id is invalid', () => {
      const element = document.createElement('div')
      element.id = 'invalidId'

      mutator.setNodeAttributes(element, document, 'classDiagram')

      const attrs = ['hx-get', 'hx-target', 'hx-swap', 'hx-indicator', 'hx-vals']
      const vals = attrs.map(element.getAttribute.bind(element))
      expect(vals).to.deep.equal([null, null, null, null, null])
    })
    it('should set correct coordinates for node control on a flowchart node', () => {
      const element = document.createElement('g')
      element.id = 'flowchart-dtmi:com:example:1-1'
      element.classList.add('unexpanded')
      element.setAttribute('transform', 'translate(100, 50)')

      const rect = document.createElement('rect')
      rect.setAttribute('width', '50')
      rect.setAttribute('height', '25')

      element.appendChild(rect)

      mutator.setNodeAttributes(element, document, 'flowchart')
      const text = element.querySelector('text.corner-sign')

      expect(text?.getAttribute('x')).to.equal('20')
      expect(text?.getAttribute('y')).to.equal('7.5')
      expect(text?.innerHTML).to.equal('+')
    })
    it('should set correct coordinates for node control on a classDiagram node', () => {
      const element = document.createElement('g')
      element.id = 'class-dtmi:com:example:1-1'
      element.classList.add('expanded')
      element.setAttribute('transform', 'translate(100, 50)')

      const pathElement = document.createElement('path')
      pathElement.setAttribute('d', 'M0 0 L100 0 L100 200 L0 200 L0 0')

      const labelElement = document.createElement('g')
      labelElement.classList.add('label-container', 'text')

      labelElement.appendChild(pathElement)
      element.appendChild(labelElement)

      mutator.setNodeAttributes(element, document, 'classDiagram')
      const text = element.querySelector('text.corner-sign')

      expect(text?.getAttribute('x')).to.equal('45')
      expect(text?.getAttribute('y')).to.equal('-80')
      expect(text?.innerHTML).to.equal('-')
    })
    it('should return an element with highlighted if matches', () => {
      const element = document.createElement('div')
      const rectElement = document.createElement('rect')
      rectElement.setAttribute('width', '50')
      rectElement.setAttribute('height', '25')

      element.id = 'flowchart-dtmi:com:example:1-1'
      element.appendChild(rectElement)
      element.classList.add('unexpanded')
      element.setAttribute('transform', 'translate(100, 50)')

      mutator.setNodeAttributes(element, document, 'flowchart', 'dtmi:com:example:1')

      expect(element.getAttribute('highlighted')).to.equal('')
    })
    it("should not return an element with highlighted if doesn't match", () => {
      const element = document.createElement('div')
      const rectElement = document.createElement('rect')
      rectElement.setAttribute('width', '50')
      rectElement.setAttribute('height', '25')

      element.id = 'flowchart-dtmi:com:example:1-1'
      element.appendChild(rectElement)
      element.classList.add('unexpanded')
      element.setAttribute('transform', 'translate(100, 50)')

      mutator.setNodeAttributes(element, document, 'flowchart', 'dtmi:com:example:2')

      expect(element.getAttribute('highlighted')).to.equal(null)
    })
  })

  describe('setEdgeAttributes', () => {
    let dom: JSDOM, document: Document

    beforeEach(() => {
      dom = new JSDOM()
      document = dom.window.document
    })

    it('should return an element without htmx attributes if it is not in the relationship map', () => {
      const labelInner = document.createElement('text')
      labelInner.classList.add('text-inner-tspan')
      labelInner.innerHTML = 'bar'

      const label = document.createElement('g')
      label.appendChild(labelInner)

      const line = document.createElement('g')
      line.id = 'test_foo_1_2_3'

      const relationshipMap = new Map()

      mutator.setEdgeAttributes(line, label, relationshipMap)

      expect(label.hasAttribute('hx-get')).to.equal(false)
      expect(label.hasAttribute('hx-target')).to.equal(false)
      expect(label.hasAttribute('hx-swap')).to.equal(false)
      expect(label.hasAttribute('hx-indicator')).to.equal(false)
      expect(label.hasAttribute('hx-vals')).to.equal(false)
      expect(label.hasAttribute('clickable')).to.equal(false)
    })

    it('should return an element with htmx attributes if it is in the relationship map', () => {
      const labelInner = document.createElement('text')
      labelInner.classList.add('text-inner-tspan')
      labelInner.innerHTML = 'bar'

      const label = document.createElement('g')
      label.appendChild(labelInner)

      const line = document.createElement('g')
      line.id = 'test_foo_1_2_3'

      const relationshipMap = new Map([['foo_bar', 'baz']])

      mutator.setEdgeAttributes(line, label, relationshipMap)

      expect(label.getAttribute('hx-get')).to.equal('update-layout')
      expect(label.getAttribute('hx-target')).to.equal('#mermaid-output')
      expect(label.getAttribute('hx-swap')).to.equal('outerHTML transition:true')
      expect(label.getAttribute('hx-indicator')).to.equal('#spinner')
      expect(label.getAttribute('hx-vals')).to.equal(JSON.stringify({ highlightNodeId: 'baz' }))

      expect(label.hasAttribute('clickable')).to.equal(true)
    })

    it('should return an element with htmx attributes if it is in the relationship map but with a long name', () => {
      const labelInner1 = document.createElement('text')
      const labelInner2 = document.createElement('text')
      labelInner1.classList.add('text-inner-tspan')
      labelInner2.classList.add('text-inner-tspan')
      labelInner1.innerHTML = 'bar'
      labelInner2.innerHTML = 'long'

      const label = document.createElement('g')
      label.appendChild(labelInner1)
      label.appendChild(labelInner2)

      const line = document.createElement('g')
      line.id = 'test_foo_1_2_3'

      const relationshipMap = new Map([['foo_barlong', 'baz']])

      mutator.setEdgeAttributes(line, label, relationshipMap)

      expect(label.getAttribute('hx-get')).to.equal('update-layout')
      expect(label.getAttribute('hx-target')).to.equal('#mermaid-output')
      expect(label.getAttribute('hx-swap')).to.equal('outerHTML transition:true')
      expect(label.getAttribute('hx-indicator')).to.equal('#spinner')
      expect(label.getAttribute('hx-vals')).to.equal(JSON.stringify({ highlightNodeId: 'baz' }))

      expect(label.hasAttribute('clickable')).to.equal(true)
    })

    it('should set highlighted node if it matches', () => {
      const labelInner = document.createElement('text')
      labelInner.classList.add('text-inner-tspan')
      labelInner.innerHTML = 'bar'

      const label = document.createElement('g')
      label.appendChild(labelInner)

      const line = document.createElement('g')
      line.id = 'test_foo_1_2_3'

      const relationshipMap = new Map([['foo_bar', 'baz']])

      mutator.setEdgeAttributes(line, label, relationshipMap, 'baz')

      expect(label.hasAttribute('highlighted')).to.equal(true)
      expect(line.hasAttribute('highlighted')).to.equal(true)
    })

    it('should not set highlighted node if it does not matches', () => {
      const labelInner = document.createElement('text')
      labelInner.classList.add('text-inner-tspan')
      labelInner.innerHTML = 'bar'

      const label = document.createElement('g')
      label.appendChild(labelInner)

      const line = document.createElement('g')
      line.id = 'test_foo_1_2_3'

      const relationshipMap = new Map([['foo_bar', 'baz']])

      mutator.setEdgeAttributes(line, label, relationshipMap, 'other')

      expect(!label.hasAttribute('highlighted')).to.equal(true)
      expect(!line.hasAttribute('highlighted')).to.equal(true)
    })

    it('marks extends edges for styling', () => {
      const labelInner = document.createElement('text')
      labelInner.classList.add('text-inner-tspan')
      labelInner.innerHTML = 'extends'

      const label = document.createElement('g')
      label.appendChild(labelInner)

      const line = document.createElement('g')
      line.id = 'test_extends_1_2_3'

      const relationshipMap = new Map()

      mutator.setEdgeAttributes(line, label, relationshipMap)

      expect(line.hasAttribute('extends-edge')).to.equal(true)
      expect(label.hasAttribute('extends-edge')).to.equal(true)
    })
  })

  describe('setSVGAttributes', () => {
    it('should mutate mermaid svg with added attributes', () => {
      const controlStringElement =
        '<svg id="mermaid-svg" width="1024" height="768"><g class="nodes"/><g class="edgePaths"/><g class="edgeLabels"/></svg>'

      const render = new MermaidSvgRender(Buffer.from(controlStringElement))
      mutator.setSVGAttributes(render, mockDtdlObjectModel, defaultParams)

      const attributes = render.svgElement.attributes
      expect(attributes.getNamedItem('hx-include')?.value).to.equal(
        '#viewId, #search-panel, input[name="navigationPanelTab"]'
      )
      expect(attributes.getNamedItem('viewBox')?.value).to.equal('0 0 300 100')
      expect(attributes.getNamedItem('height')?.value).to.equal('100')
      expect(attributes.getNamedItem('width')?.value).to.equal('300')
    })

    it('should set clickable node elements to have htmx attributes that do not expand or truncate', () => {
      const controlStringElement = `
      <svg id="mermaid-svg" width="1024" height="768">
        <g class="nodes">
          <g id="flowchart-dtmi:com:foo:1-1" class="node clickable"/>
          <g id="flowchart-dtmi:com:bar:1-1" class="node clickable"/>
        </g>
        <g class="edgePaths"/>
        <g class="edgeLabels"/>
      </svg>
        `

      const render = new MermaidSvgRender(Buffer.from(controlStringElement))
      mutator.setSVGAttributes(render, mockDtdlObjectModel, defaultParams)

      const fooAttrs = render.document.getElementById('flowchart-dtmi:com:foo:1-1')?.attributes
      expect(fooAttrs?.getNamedItem('hx-get')?.value).to.equal('update-layout')
      expect(fooAttrs?.getNamedItem('hx-target')?.value).to.equal('#mermaid-output')
      expect(fooAttrs?.getNamedItem('hx-swap')?.value).to.equal('outerHTML transition:true')
      expect(fooAttrs?.getNamedItem('hx-indicator')?.value).to.equal('#spinner')
      expect(fooAttrs?.getNamedItem('hx-vals')?.value).to.equal(JSON.stringify({ highlightNodeId: 'dtmi:com:foo:1' }))

      const barAttrs = render.document.getElementById('flowchart-dtmi:com:bar:1-1')?.attributes
      expect(barAttrs?.getNamedItem('hx-get')?.value).to.equal('update-layout')
      expect(barAttrs?.getNamedItem('hx-target')?.value).to.equal('#mermaid-output')
      expect(barAttrs?.getNamedItem('hx-swap')?.value).to.equal('outerHTML transition:true')
      expect(barAttrs?.getNamedItem('hx-indicator')?.value).to.equal('#spinner')
      expect(barAttrs?.getNamedItem('hx-vals')?.value).to.equal(JSON.stringify({ highlightNodeId: 'dtmi:com:bar:1' }))
    })

    it('should set clickable node elements to have htmx attributes that expand or truncate', () => {
      const controlStringElement = `
      <svg id="mermaid-svg" width="1024" height="768">
        <g class="nodes">
          <g id="flowchart-dtmi:com:foo:1-1" class="node clickable unexpanded" transform="translate(100, 50)">
            <rect width="50" height="25"></rect>
          </g>
          <g id="flowchart-dtmi:com:bar:1-1" class="node clickable expanded" transform="translate(100, 50)">
            <rect width="50" height="25"></rect>
          </g>
        </g>
        <g class="edgePaths"/>
        <g class="edgeLabels"/>
      </svg>
      `
      const render = new MermaidSvgRender(Buffer.from(controlStringElement))
      mutator.setSVGAttributes(render, mockDtdlObjectModel, defaultParams)

      const fooCornerElement = render.svgElement.querySelector('#flowchart-dtmi\\:com\\:foo\\:1-1 > text.corner-sign')
      expect(fooCornerElement?.innerHTML).to.equal('+')
      expect(fooCornerElement?.getAttribute('onclick')).to.equal('event.stopPropagation()')
      expect(fooCornerElement?.getAttribute('hx-get')).to.equal('update-layout')
      expect(fooCornerElement?.getAttribute('hx-target')).to.equal('#mermaid-output')
      expect(fooCornerElement?.getAttribute('hx-swap')).to.equal('outerHTML transition:true')
      expect(fooCornerElement?.getAttribute('hx-indicator')).to.equal('#spinner')
      expect(fooCornerElement?.getAttribute('hx-vals')).to.equal(
        JSON.stringify({ shouldExpand: true, shouldTruncate: false })
      )
      const barCornerElement = render.svgElement.querySelector('#flowchart-dtmi\\:com\\:bar\\:1-1 > text.corner-sign')
      expect(barCornerElement?.innerHTML).to.equal('-')
      expect(barCornerElement?.getAttribute('onclick')).to.equal('event.stopPropagation()')
      expect(barCornerElement?.getAttribute('hx-get')).to.equal('update-layout')
      expect(barCornerElement?.getAttribute('hx-target')).to.equal('#mermaid-output')
      expect(barCornerElement?.getAttribute('hx-swap')).to.equal('outerHTML transition:true')
      expect(barCornerElement?.getAttribute('hx-indicator')).to.equal('#spinner')
      expect(barCornerElement?.getAttribute('hx-vals')).to.equal(
        JSON.stringify({ shouldExpand: false, shouldTruncate: true })
      )
    })

    it('should set highlighted node with highlighted attr', () => {
      const controlStringElement = `
      <svg id="mermaid-svg" width="1024" height="768">
        <g class="nodes">
          <g id="flowchart-dtmi:com:foo:1-1" class="node">
            <g></g>
          </g>
          <g id="flowchart-dtmi:com:bar:1-1" class="node">
            <rect></rect>
          </g>
        </g>
        <g class="edgePaths"/>
        <g class="edgeLabels"/>
      </svg>
      `
      const render = new MermaidSvgRender(Buffer.from(controlStringElement))
      mutator.setSVGAttributes(render, mockDtdlObjectModel, {
        ...defaultParams,
        highlightNodeId: 'dtmi:com:foo:1',
      })

      const fooElement = render.document.querySelector('#flowchart-dtmi\\:com\\:foo\\:1-1')
      expect(fooElement?.getAttribute('highlighted')).to.equal('')
      const barElement = render.document.querySelector('#flowchart-dtmi\\:com\\:bar\\:1-1')
      expect(barElement?.getAttribute('highlighted')).to.equal(null)
    })
  })
  describe('addCornerSign', () => {
    let dom: JSDOM, document: Document, element: Element

    beforeEach(() => {
      dom = new JSDOM()
      document = dom.window.document
      element = document.createElement('g')
    })

    it('should add a text element with "+" sign for unexpanded elements', () => {
      element.classList.add('unexpanded')
      const position = { width: 100, height: 50 }
      const hxAttributes = {
        'hx-get': 'update-layout',
        'hx-target': '#mermaid-output',
      }

      mutator.addCornerSign(element, position, document, hxAttributes)

      const textElement = element.querySelector('text.corner-sign')

      expect(textElement).to.not.equal(null)
      if (!textElement) {
        throw new Error('Text element was not created.')
      }

      expect(textElement.getAttribute('x')).to.equal('45')
      expect(textElement.getAttribute('y')).to.equal('-5')
      expect(textElement.textContent).to.equal('+')
      expect(textElement.getAttribute('onclick')).to.equal('event.stopPropagation()')
    })

    it('should add a text element with "-" sign for unexpanded elements', () => {
      element.classList.add('expanded')
      const position = { width: 100, height: 50 }
      const hxAttributes = {
        'hx-get': 'update-layout',
        'hx-target': '#mermaid-output',
      }

      mutator.addCornerSign(element, position, document, hxAttributes)

      const textElement = element.querySelector('text.corner-sign')

      expect(textElement).to.not.equal(null)
      if (!textElement) {
        throw new Error('Text element was not created.')
      }

      expect(textElement.getAttribute('x')).to.equal('45')
      expect(textElement.getAttribute('y')).to.equal('-5')
      expect(textElement.textContent).to.equal('-')
      expect(textElement.getAttribute('onclick')).to.equal('event.stopPropagation()')
    })
  })

  describe('setupAnimations', () => {
    it('should return new output if no nodes are present in both svgs', () => {
      const newOutput = new MermaidSvgRender(Buffer.from(svgSearchFuelType))
      const oldOutput = new MermaidSvgRender(Buffer.from(svgSearchNuclear))

      const result = mutator.setupAnimations(
        { diagramType: 'flowchart', layout: 'elk', search: 'FuelType', expandedIds: [] },
        newOutput,
        oldOutput,
        1,
        0,
        0,
        2000,
        2000
      )

      expect(result).to.deep.equal({
        pan: { x: 0, y: 0 },
        zoom: 1,
      })
      expect(newOutput.renderToString()).to.equal(svgSearchFuelType)
    })
  })

  // this is essentially a snapshot test moving from a search of `FuelType` to the same search but with the `FossilFuel` node expanded
  it('should return with animations if nodes are present', () => {
    const newOutput = new MermaidSvgRender(Buffer.from(svgSearchFuelTypeExpandedFossilFuel))
    const oldOutput = new MermaidSvgRender(Buffer.from(svgSearchFuelType))

    const result = mutator.setupAnimations(
      {
        diagramType: 'flowchart',
        layout: 'elk',
        search: 'FuelType',
        expandedIds: ['dtmi:digitaltwins:ngsi_ld:cim:energy:FossilFuel;1'],
        highlightNodeId: 'dtmi:digitaltwins:ngsi_ld:cim:energy:FossilFuel:1',
      },
      newOutput,
      oldOutput,
      1,
      0,
      0,
      2000,
      2000
    )

    expect(result).to.deep.equal({
      zoom: 1,
      pan: { x: -97.73958333333334, y: -147 },
    })
    expect(newOutput.renderToString()).to.equal(withAnimationsOutputFixture)
  })
})
