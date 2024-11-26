import { ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { defaultParams } from '../../../controllers/__tests__/root.test'
import { SvgGenerator } from '../generator'
import {
  classDiagramFixtureSimple,
  classDiagramFixtureSimpleHighlighted,
  flowchartFixtureSimple,
  flowchartFixtureSimpleHighlighted,
  simpleMockDtdlObjectModel,
} from './fixtures'
import { checkIfStringIsSVG } from './helpers'

describe('Generator', () => {
  const generator = new SvgGenerator()

  describe('mermaidMarkdownByChartType', () => {
    it('should return a flowchart graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD'
      )
      expect(markdown).to.equal(flowchartFixtureSimple)
    })

    it('should return a flowchart graph for a simple dtdl model with highlighted node', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD',
        'dtmi:com:example:1'
      )
      expect(markdown).to.equal(flowchartFixtureSimpleHighlighted)
    })

    it('should return a classDiagram graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['classDiagram'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD'
      )
      expect(markdown).to.equal(classDiagramFixtureSimple)
    })

    it('should return a classDiagram graph for a simple dtdl model with highlighted node', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['classDiagram'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD',
        'dtmi:com:example:1'
      )
      expect(markdown).to.equal(classDiagramFixtureSimpleHighlighted)
    })

    it('should return null for empty object model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        {},
        ' TD',
        'dtmi:com:example:1'
      )
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
      const generatedOutput = await generator.run({}, defaultParams, options)
      expect(generatedOutput).to.equal(`No graph`)
    })

    it('should return a simple svg', async () => {
      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, defaultParams, options)
      expect(checkIfStringIsSVG(generatedOutput)).to.equal(true)
    })

    it('should retry if an error occurs', async () => {
      const generator = new SvgGenerator()
      const browser = await generator.browser
      const stub = sinon.stub(browser, 'newPage').onFirstCall().rejects('Error').callThrough()

      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, defaultParams, options)

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

      element.id = 'flowchart-dtmi:com:example:1-1'
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
  })
  describe('setSVGAttributes', () => {
    it('should return a html string with added attributes', () => {
      const controlStringElement = '<svg id="mermaid-svg" width="1024" height="768"/>'
      const testElement = '<svg id="mermaid-svg" viewBox="0 0 300 100" hx-include="#search-panel"/>'
      expect(generator.setSVGAttributes(controlStringElement, defaultParams)).to.equal(testElement)
    })

    it('should set clickable node elements to have htmx attributes that do not expand or truncate', () => {
      const controlStringElement = `
      <svg id="mermaid-svg" width="1024" height="768">
        <g id="foo" class="node clickable"/>
        <g id="bar" class="node clickable"/>
      </svg>
      `
      const testElement = `<svg id="mermaid-svg" viewBox="0 0 300 100" hx-include="#search-panel">
        <g id="foo" class="node clickable" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:null}"/>
        <g id="bar" class="node clickable" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:null}"/>
      </svg>`
      expect(generator.setSVGAttributes(controlStringElement, defaultParams)).to.equal(testElement)
    })

    it('should set clickable node elements to have htmx attributes that expand or truncate', () => {
      const controlStringElement = `
      <svg id="mermaid-svg" width="1024" height="768">
        <g id="foo" class="node clickable unexpanded">
          <g></g>
        </g>
        <g id="bar" class="node clickable expanded">
          <rect></rect>
        </g>
      </svg>
      `
      const testElement = `<svg id="mermaid-svg" viewBox="0 0 300 100" hx-include="#search-panel">
        <g id="foo" class="node clickable unexpanded" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:null}">
          <g/>
        <text x="-10" y="20" class="corner-sign" onclick="event.stopPropagation()" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML" hx-indicator="#spinner" hx-vals="{&quot;shouldExpand&quot;:true,&quot;shouldTruncate&quot;:false}">+</text></g>
        <g id="bar" class="node clickable expanded" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML" hx-indicator="#spinner" hx-vals="{&quot;highlightNodeId&quot;:null}">
          <rect/>
        <text x="-10" y="20" class="corner-sign" onclick="event.stopPropagation()" hx-get="/update-layout" hx-target="#mermaid-output" hx-swap="outerHTML" hx-indicator="#spinner" hx-vals="{&quot;shouldExpand&quot;:false,&quot;shouldTruncate&quot;:true}">-</text></g>
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
      const position = { x: 100, y: 50 }
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

      expect(textElement.getAttribute('x')).to.equal('100')
      expect(textElement.getAttribute('y')).to.equal('50')
      expect(textElement.textContent).to.equal('+')
      expect(textElement.getAttribute('onclick')).to.equal('event.stopPropagation()')
    })

    it('should add a text element with "-" sign for unexpanded elements', () => {
      element.classList.add('expanded')
      const position = { x: 100, y: 50 }
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

      expect(textElement.getAttribute('x')).to.equal('100')
      expect(textElement.getAttribute('y')).to.equal('50')
      expect(textElement.textContent).to.equal('-')
      expect(textElement.getAttribute('onclick')).to.equal('event.stopPropagation()')
    })
  })
  describe('extractTransformData', () => {
    let dom: JSDOM, document: Document, element: Element, labelElement: Element, membersElement: Element

    beforeEach(() => {
      dom = new JSDOM()
      document = dom.window.document
      element = document.createElement('g')
      labelElement = document.createElement('g')
      membersElement = document.createElement('g')
    })

    it('should extract the x and y coordinate from the transform attribute', () => {
      labelElement.setAttribute('transform', 'translate(0,20)')
      membersElement.setAttribute('transform', 'translate(10,0)')

      labelElement.classList.add('label-group')
      labelElement.classList.add('text')

      membersElement.classList.add('members-group')
      membersElement.classList.add('text')

      element.appendChild(labelElement)
      element.appendChild(membersElement)

      const coordinates = generator.extractTransformData(element)
      expect(coordinates).to.deep.equal({ x: -10, y: 20 })
    })
    it('should return null if the x and y coordinates do not exist in children element attributes of a given element', () => {
      expect(generator.extractTransformData(element)).to.equal(null)

      labelElement.classList.add('label-group')
      labelElement.classList.add('text')

      membersElement.classList.add('members-group')
      membersElement.classList.add('text')

      element.appendChild(labelElement)
      element.appendChild(membersElement)

      expect(generator.extractTransformData(element)).to.equal(null)

      labelElement.setAttribute('transform', 'translate(x,y)')
      membersElement.setAttribute('transform', 'translate(x,y)')

      expect(generator.extractTransformData(element)).to.equal(null)
    })
  })
  describe('calculateCornerSignPosition', () => {
    let dom: JSDOM, document: Document, element: Element

    beforeEach(() => {
      dom = new JSDOM()
      document = dom.window.document
      element = document.createElement('g')
    })
    it('should return { x:0, y:0 } if no rect or g element is found as the first child element', () => {
      expect(generator.calculateCornerSignPosition(element, 'classDiagram')).to.deep.equal({ x: 0, y: 0 })
    })
    it('should return { x:0, y:0 } if width, x and y attribute not found in rect child element', () => {
      const rect = document.createElement('rect')
      element.appendChild(rect)
      expect(generator.calculateCornerSignPosition(element, 'flowchart')).to.deep.equal({ x: -10, y: 20 })
    })
    it('should return { x:190, y:120 } if width, x and y attribute not found in rect child element', () => {
      const rect = document.createElement('rect')
      rect.setAttribute('width', '100')
      rect.setAttribute('x', '100')
      rect.setAttribute('y', '100')
      element.appendChild(rect)
      expect(generator.calculateCornerSignPosition(element, 'flowchart')).to.deep.equal({ x: 190, y: 120 })
    })
  })
})
