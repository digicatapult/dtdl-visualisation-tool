import { ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { defaultParams } from '../../../controllers/__tests__/root.test'
import { SvgGenerator } from '../generator'
import { classDiagramFixtureSimple, flowchartFixtureSimple, simpleMockDtdlObjectModel } from './fixtures'
import { checkIfStringIsSVG } from './helpers'

describe('Generator', function () {
  this.timeout(10000)
  const generator = new SvgGenerator()

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
      expect(generatedOutput).to.equal(`No graph`)
    })

    it('should return a simple svg', async () => {
      const generatedOutput = await generator.run(
        simpleMockDtdlObjectModel,
        defaultParams.diagramType,
        defaultParams.layout,
        options
      )
      expect(checkIfStringIsSVG(generatedOutput)).to.equal(true)
    })

    it('should retry if an error occurs', async () => {
      const generator = new SvgGenerator()
      const browser = await generator.browser
      const stub = sinon.stub(browser, 'newPage').onFirstCall().rejects('Error').callThrough()

      const generatedOutput = await generator.run(
        simpleMockDtdlObjectModel,
        defaultParams.diagramType,
        defaultParams.layout,
        options
      )

      expect(checkIfStringIsSVG(generatedOutput)).to.equal(true)
      expect(stub.callCount).to.equal(1)
    })
  })

  describe('getMermaidIdFromNodeId', () => {
    it('should return a mermaidId from a svg node id', () => {
      const svgNodeId = 'flowchart-dtmi:com:example:1-1'
      expect(generator.getMermaidIdFromNodeId(svgNodeId)).to.equal('dtmi:com:example:1')
    })
    it('should return a null from a string that does not match the regex pattern', () => {
      const nonMatchingString = 'dtmi:com:example:1'
      expect(generator.getMermaidIdFromNodeId(nonMatchingString)).to.equal(null)
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

    it('should set highlighNodeId to be null', () => {
      const element = document.createElement('div')
      element.id = 'invalidId'

      generator.setNodeAttributes(element, document, 'classDiagram')

      const hxVals = JSON.parse(element.getAttribute('hx-vals') ?? '')
      expect(hxVals.highlightNodeId).to.equal(null)
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
  describe('setSVGAttributes', () => {
    it('should return a html string with added attributes', () => {
      const controlStringElement = '<svg id="mermaid-svg" width="1024" height="768"/>'
      const testElement =
        '<svg id="mermaid-svg" width="300" height="100" viewBox="0 0 300 100" hx-include="#search-panel"/>'
      expect(generator.setSVGAttributes(controlStringElement, defaultParams)).to.equal(testElement)
    })

    it('should set clickable node elements to have htmx attributes that do not expand or truncate', () => {
      const controlStringElement = `
      <svg id="mermaid-svg" width="1024" height="768">
        <g id="foo" class="node clickable"/>
        <g id="bar" class="node clickable"/>
      </svg>
      `
      const testElement = `<svg id="mermaid-svg" width="300" height="100" viewBox="0 0 300 100" hx-include="#search-panel">
        <g id="foo" class="node clickable" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:null}"/>
        <g id="bar" class="node clickable" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:null}"/>
      </svg>`
      expect(generator.setSVGAttributes(controlStringElement, defaultParams)).to.equal(testElement)
    })

    it('should set clickable node elements to have htmx attributes that expand or truncate', () => {
      const controlStringElement = `
      <svg id="mermaid-svg" width="1024" height="768">
        <g id="foo" class="node clickable unexpanded" transform="translate(100, 50)">
          <rect width="50" height="25"></rect>
          <g></g>
        </g>
        <g id="bar" class="node clickable expanded" transform="translate(100, 50)">
          <rect width="50" height="25"></rect>
        </g>
      </svg>
      `
      const testElement = `<svg id="mermaid-svg" width="300" height="100" viewBox="0 0 300 100" hx-include="#search-panel">
        <g id="foo" class="node clickable unexpanded" transform="translate(100, 50)" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:null}">
          <rect width="50" height="25"/>
          <g/>
        <text x="20" y="7.5" class="corner-sign" onclick="event.stopPropagation()" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;shouldExpand&quot;:true,&quot;shouldTruncate&quot;:false}">+</text></g>
        <g id="bar" class="node clickable expanded" transform="translate(100, 50)" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:null}">
          <rect width="50" height="25"/>
        <text x="20" y="7.5" class="corner-sign" onclick="event.stopPropagation()" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;shouldExpand&quot;:false,&quot;shouldTruncate&quot;:true}">-</text></g>
      </svg>`
      expect(generator.setSVGAttributes(controlStringElement, defaultParams)).to.equal(testElement)
    })

    it('should throw an internal error if given svg string does not have id mermaid-svg', () => {
      const controlStringElement = '<svg id="not-mermaid-svg"/>'
      expect(() => {
        generator.setSVGAttributes(controlStringElement, defaultParams)
      })
        .to.throw('Error in finding mermaid-svg Element in generated output')
        .with.property('code', 501)
    })

    it('should set highlighted node with highlighted attr', () => {
      const controlStringElement = `
      <svg id="mermaid-svg" width="1024" height="768">
        <g id="foo-foo-1" class="node">
          <g></g>
        </g>
        <g id="bar-bar-1" class="node">
          <rect></rect>
        </g>
      </svg>
      `
      const testElement = `<svg id="mermaid-svg" width="300" height="100" viewBox="0 0 300 100" hx-include="#search-panel">
        <g id="foo-foo-1" class="node" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:&quot;foo&quot;}" highlighted="">
          <g/>
        </g>
        <g id="bar-bar-1" class="node" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML transition:true" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:&quot;bar&quot;}">
          <rect/>
        </g>
      </svg>`
      expect(
        generator.setSVGAttributes(controlStringElement, {
          ...defaultParams,
          highlightNodeId: 'foo',
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
})
