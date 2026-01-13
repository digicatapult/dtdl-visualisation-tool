import { assert, expect } from 'chai'
import { JSDOM } from 'jsdom'
import { describe, it } from 'mocha'

import { InterfaceEntity, RelationshipEntity } from '../../../models/dtdlOmParser.js'
import Flowchart, { extractFlowchartNodeCoordinates } from '../flowchart.js'
import { flowchartFixture, mockDtdlObjectModel } from './fixtures.js'
import { parseMermaid } from './helpers.js'

describe('Mermaid', function () {
  this.timeout(10000)

  describe('Flowchart', () => {
    const flowchart = new Flowchart()
    it('should return a flowchart in markdown', () => {
      expect(flowchart.generateMarkdown(mockDtdlObjectModel)).to.equal(flowchartFixture)
    })
    it('should return valid markdown', async () => {
      const markdown = flowchart.generateMarkdown(mockDtdlObjectModel)
      if (markdown === null) assert.fail()

      const parsedMermaid = await parseMermaid(markdown)

      expect(parsedMermaid).to.deep.equal({ diagramType: 'flowchart-v2', config: {} })
    })
    it('should return a list of mermaid markdown string that represent an interface ', () => {
      const interfaceAsMarkdown = flowchart.interfaceToMarkdown(
        mockDtdlObjectModel,
        mockDtdlObjectModel['dtmi:com:example_extended;1'] as InterfaceEntity
      )
      const test = [
        `dtmi:com:example_extended:1@{ shape: rect, label: "example extended"}\nclick dtmi:com:example_extended:1 getEntity`,
        `dtmi:com:example:1 --> |extends| dtmi:com:example_extended:1`,
        `class dtmi:com:example_extended:1 search`,
      ]
      expect(interfaceAsMarkdown).to.deep.equal(test)
    })
    it('should return a list of mermaid markdown string that represents a relationship ', () => {
      const relationshipAsMarkdown = flowchart.relationshipToMarkdown(
        mockDtdlObjectModel,
        mockDtdlObjectModel['dtmi:com:example_relationship;1'] as RelationshipEntity
      )
      const test = [`dtmi:com:example:1 --> |A relationship| dtmi:com:example_related:1`]
      expect(relationshipAsMarkdown).to.deep.equal(test)
    })
    it('should return undefined for a relationship with an undefined interface', () => {
      const relationshipAsMarkdown = flowchart.relationshipToMarkdown(
        mockDtdlObjectModel,
        mockDtdlObjectModel['dtmi:com:example_relationship_undefined_interface;1'] as RelationshipEntity
      )
      const test = []
      expect(relationshipAsMarkdown).to.deep.equal(test)
    })
    it('should return node string without a callback defined', () => {
      const interfaceAsMarkdown = flowchart.createNodeString(mockDtdlObjectModel['dtmi:com:example_extended;1'], false)
      const test = 'dtmi:com:example_extended:1@{ shape: rect, label: "example extended"}'
      expect(interfaceAsMarkdown).to.deep.equal(test)
    })
  })

  describe('extractFlowchartNodeCoordinates', () => {
    let dom: JSDOM, document: Document, element: Element, rectElement: Element

    beforeEach(() => {
      dom = new JSDOM()
      document = dom.window.document
      element = document.createElement('g')
      rectElement = document.createElement('rect')
    })

    it('should extract the x and y coordinate from the transform attribute and width and height from rect', () => {
      element.setAttribute('transform', 'translate(100, 50)')

      rectElement.setAttribute('width', '50')
      rectElement.setAttribute('height', '25')

      element.appendChild(rectElement)

      const coordinates = extractFlowchartNodeCoordinates(element)
      expect(coordinates).to.deep.equal({
        bottom: 62.5,
        height: 25,
        left: 75,
        right: 125,
        top: 37.5,
        width: 50,
        x: 100,
        y: 50,
      })
    })

    it('should throw if the expected children not occur on the g element', () => {
      element.setAttribute('transform', 'translate(100, 50)')

      expect(() => extractFlowchartNodeCoordinates(element)).to.throw()
    })

    it('should throw if width is missing on rect', () => {
      element.setAttribute('transform', 'translate(100, 50)')
      rectElement.setAttribute('height', '25')

      element.appendChild(rectElement)

      expect(() => extractFlowchartNodeCoordinates(element)).to.throw()
    })

    it('should throw if height is missing on rect', () => {
      element.setAttribute('transform', 'translate(100, 50)')
      rectElement.setAttribute('width', '50')

      element.appendChild(rectElement)

      expect(() => extractFlowchartNodeCoordinates(element)).to.throw()
    })
  })
})
