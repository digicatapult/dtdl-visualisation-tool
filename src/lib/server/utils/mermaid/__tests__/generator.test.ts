import { ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import sinon from 'sinon'
import { defaultParams } from '../../../controllers/__tests__/root.test'
import { SvgGenerator } from '../generator'
import {
  classDiagramFixtureSimple,
  flowchartFixtureSimple,
  simpleMockDtdlObjectModel,
  svgSearchFuelType,
  svgSearchFuelTypeExpandedFossilFuel,
  svgSearchNuclear,
  withAnimationsOutputFixture,
} from './fixtures'
import { checkIfStringIsSVG } from './helpers'

describe('Generator', function () {
  this.timeout(10000)
  const logger = pino({ level: 'silent' })
  const generator = new SvgGenerator(logger)

  describe('mermaidMarkdownByChartType', () => {
    it('should return a flowchart graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD'
      )
      expect(markdown).to.equal(flowchartFixtureSimple)
    })

    it('should return a classDiagram graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['classDiagram'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD'
      )
      expect(markdown).to.equal(classDiagramFixtureSimple)
    })

    it('should return null for empty object model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown({}, ' TD')
      expect(markdown).to.equal(null)
    })
  })

  describe('run', () => {
    const options: ParseMDDOptions = {
      viewport: {
        width: 120,
        height: 48,
        deviceScaleFactor: 1,
      },
    }

    it('should return no graph for empty object model', async () => {
      const generatedOutput = await generator.run({}, defaultParams.diagramType, defaultParams.layout, options)
      expect(generatedOutput.type).to.equal('text')
      expect(generatedOutput.content).to.equal(`No graph`)
    })

    it('should return a simple svg', async () => {
      const generatedOutput = await generator.run(
        simpleMockDtdlObjectModel,
        defaultParams.diagramType,
        defaultParams.layout,
        options
      )
      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.content)).to.equal(true)
    })

    it('should retry if an error occurs', async () => {
      const generator = new SvgGenerator(logger)
      const browser = await generator.browser
      const stub = sinon.stub(browser, 'newPage').onFirstCall().rejects('Error').callThrough()

      const generatedOutput = await generator.run(
        simpleMockDtdlObjectModel,
        defaultParams.diagramType,
        defaultParams.layout,
        options
      )

      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.content)).to.equal(true)
      expect(stub.callCount).to.equal(1)
    })
  })

  describe('getMermaidIdFromNodeId', () => {
    it('should return a mermaidId from a svg node id', () => {
      const svgNodeId = 'flowchart-dtmi:com:example:1-1'
      expect(generator.getMermaidIdFromId(svgNodeId, 'node')).to.equal('dtmi:com:example:1')
    })
    it('should return a null from a string that does not match the node regex pattern', () => {
      const nonMatchingString = 'dtmi:com:example:1'
      expect(generator.getMermaidIdFromId(nonMatchingString, 'node')).to.equal(null)
    })
    it('should return a mermaidId from a svg edge id', () => {
      const svgNodeId = 'test_edge_id_0_1_2_345'
      expect(generator.getMermaidIdFromId(svgNodeId, 'edge')).to.equal('edge_id')
    })
    it('should return a null from a string that does not match the edge regex pattern', () => {
      const nonMatchingString = 'dtmi:com:example:1'
      expect(generator.getMermaidIdFromId(nonMatchingString, 'edge')).to.equal(null)
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

      generator.setNodeAttributes(element, document, 'flowchart')

      expect(element.getAttribute('hx-get')).to.equal('/update-layout')
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

      generator.setNodeAttributes(element, document, 'classDiagram')

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

      generator.setNodeAttributes(element, document, 'flowchart')
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

      generator.setNodeAttributes(element, document, 'classDiagram')
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

      generator.setNodeAttributes(element, document, 'flowchart', 'dtmi:com:example:1')

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

      generator.setNodeAttributes(element, document, 'flowchart', 'dtmi:com:example:2')

      expect(element.getAttribute('highlighted')).to.equal(null)
    })
  })

  describe('setEdgeAttributes', () => {
    let dom: JSDOM, document: Document

    beforeEach(() => {
      dom = new JSDOM()
      document = dom.window.document
    })

    it('should return an element with htmx attributes', () => {
      const labelInner = document.createElement('text')
      labelInner.classList.add('text-inner-tspan')

      const element = document.createElement('div')
      const rectElement = document.createElement('rect')
      rectElement.setAttribute('width', '50')
      rectElement.setAttribute('height', '25')

      element.id = 'flowchart-dtmi:com:example:1-1'
      element.setAttribute('transform', 'translate(100, 50)')
      element.appendChild(rectElement)
      element.classList.add('unexpanded')

      generator.setNodeAttributes(element, document, 'flowchart')

      expect(element.getAttribute('hx-get')).to.equal('/update-layout')
      expect(element.getAttribute('hx-target')).to.equal('#mermaid-output')

      const hxVals = {
        ...JSON.parse(element.getAttribute('hx-vals') ?? ''),
        ...JSON.parse(element.querySelector('text')?.getAttribute('hx-vals') ?? ''),
      }

      expect(hxVals.highlightNodeId).to.equal('dtmi:com:example:1')
      expect(hxVals.shouldExpand).to.equal(true)
      expect(hxVals.shouldTruncate).to.equal(false)
    })
  })

  describe('setSVGAttributes', () => {
    it('should return a html string with added attributes', () => {
      const controlStringElement =
        '<svg id="mermaid-svg" width="1024" height="768"><g class="nodes"/><g class="edgePaths"/><g class="edgeLabels"/></svg>'
      const testElement =
        '<svg id="mermaid-svg" width="300" height="100" viewBox="0 0 300 100" hx-include="#sessionId, #search-panel"><g class="edgePaths"/><g class="edgeLabels"/><g class="nodes"/></svg>'
      expect(generator.setSVGAttributes(controlStringElement, simpleMockDtdlObjectModel, defaultParams)).to.equal(
        testElement
      )
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
      const testElement = `<svg id="mermaid-svg" width="300" height="100" viewBox="0 0 300 100" hx-include="#sessionId, #search-panel">
        
        <g class="edgePaths"/>
        <g class="edgeLabels"/>
      <g class="nodes">
          <g id="flowchart-dtmi:com:foo:1-1" class="node clickable" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:&quot;dtmi:com:foo:1&quot;}"/>
          <g id="flowchart-dtmi:com:bar:1-1" class="node clickable" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:&quot;dtmi:com:bar:1&quot;}"/>
        </g></svg>`
      expect(generator.setSVGAttributes(controlStringElement, simpleMockDtdlObjectModel, defaultParams)).to.equal(
        testElement
      )
    })

    it('should set clickable node elements to have htmx attributes that expand or truncate', () => {
      const controlStringElement = `
      <svg id="mermaid-svg" width="1024" height="768">
        <g class="nodes">
          <g id="flowchart-dtmi:com:foo:1-1" class="node clickable unexpanded" transform="translate(100, 50)">
            <rect width="50" height="25"></rect>
            <g></g>
          </g>
          <g id="flowchart-dtmi:com:bar:1-1" class="node clickable expanded" transform="translate(100, 50)">
            <rect width="50" height="25"></rect>
          </g>
        </g>
        <g class="edgePaths"/>
        <g class="edgeLabels"/>
      </svg>
      `
      const testElement = `<svg id="mermaid-svg" width="300" height="100" viewBox="0 0 300 100" hx-include="#sessionId, #search-panel">
        
        <g class="edgePaths"/>
        <g class="edgeLabels"/>
      <g class="nodes">
          <g id="flowchart-dtmi:com:foo:1-1" class="node clickable unexpanded" transform="translate(100, 50)" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:&quot;dtmi:com:foo:1&quot;}">
            <rect width="50" height="25"/>
            <g/>
          <text x="20" y="7.5" class="corner-sign" onclick="event.stopPropagation()" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;shouldExpand&quot;:true,&quot;shouldTruncate&quot;:false}">+</text></g>
          <g id="flowchart-dtmi:com:bar:1-1" class="node clickable expanded" transform="translate(100, 50)" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:&quot;dtmi:com:bar:1&quot;}">
            <rect width="50" height="25"/>
          <text x="20" y="7.5" class="corner-sign" onclick="event.stopPropagation()" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;shouldExpand&quot;:false,&quot;shouldTruncate&quot;:true}">-</text></g>
        </g></svg>`
      expect(generator.setSVGAttributes(controlStringElement, simpleMockDtdlObjectModel, defaultParams)).to.equal(
        testElement
      )
    })

    it('should throw an internal error if given svg string does not have id mermaid-svg', () => {
      const controlStringElement = '<svg id="not-mermaid-svg"/>'
      expect(() => {
        generator.setSVGAttributes(controlStringElement, simpleMockDtdlObjectModel, defaultParams)
      })
        .to.throw('Error in finding mermaid-svg Element in generated output')
        .with.property('code', 501)
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
      const testElement = `<svg id="mermaid-svg" width="300" height="100" viewBox="0 0 300 100" hx-include="#sessionId, #search-panel">
        
        <g class="edgePaths"/>
        <g class="edgeLabels"/>
      <g class="nodes">
          <g id="flowchart-dtmi:com:foo:1-1" class="node" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:&quot;dtmi:com:foo:1&quot;}" highlighted="">
            <g/>
          </g>
          <g id="flowchart-dtmi:com:bar:1-1" class="node" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:&quot;dtmi:com:bar:1&quot;}">
            <rect/>
          </g>
        </g></svg>`
      expect(
        generator.setSVGAttributes(controlStringElement, simpleMockDtdlObjectModel, {
          ...defaultParams,
          highlightNodeId: 'dtmi:com:foo:1',
        })
      ).to.equal(testElement)
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
        'hx-get': '/update-layout',
        'hx-target': '#mermaid-output',
      }

      generator.addCornerSign(element, position, document, hxAttributes)

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
        'hx-get': '/update-layout',
        'hx-target': '#mermaid-output',
      }

      generator.addCornerSign(element, position, document, hxAttributes)

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
      const result = generator.setupAnimations(
        { diagramType: 'flowchart', layout: 'elk', search: 'FuelType', expandedIds: [] },
        svgSearchFuelType,
        svgSearchNuclear,
        1,
        0,
        0,
        2000,
        2000
      )

      expect(result).to.deep.equal({
        pan: { x: 0, y: 0 },
        zoom: 1,
        generatedOutput: svgSearchFuelType,
      })
    })
  })

  // this is essentially a snapshot test moving from a search of `FuelType` to the same search but with the `FossilFuel` node expanded
  it('should return with animations if nodes are present', () => {
    const result = generator.setupAnimations(
      {
        diagramType: 'flowchart',
        layout: 'elk',
        search: 'FuelType',
        expandedIds: ['dtmi:digitaltwins:ngsi_ld:cim:energy:FossilFuel;1'],
        highlightNodeId: 'dtmi:digitaltwins:ngsi_ld:cim:energy:FossilFuel:1',
      },
      svgSearchFuelTypeExpandedFossilFuel,
      svgSearchFuelType,
      1,
      0,
      0,
      2000,
      2000
    )

    expect(result).to.deep.equal({
      generatedOutput: withAnimationsOutputFixture,
      zoom: 1,
      pan: { x: -97.73958333333334, y: -147 },
    })
  })
})
