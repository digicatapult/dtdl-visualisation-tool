import { InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { assert, expect } from 'chai'
import { JSDOM } from 'jsdom'
import { describe, it } from 'mocha'
import ClassDiagram, { arrowTypes, extractClassNodeCoordinate } from '../classDiagram'
import { classDiagramFixture, mockDtdlModelWithProperty, mockDtdlObjectModel } from './fixtures'
import { parseMermaid } from './helpers'

describe('ClassDiagram', function () {
  this.timeout(10000)

  const classDiagram = new ClassDiagram()
  describe('generateMarkdown', () => {
    it('should return a flowchart in markdown', () => {
      expect(classDiagram.generateMarkdown(mockDtdlObjectModel)).to.equal(classDiagramFixture)
    })
    it('should return valid markdown', async () => {
      const markdown = classDiagram.generateMarkdown(mockDtdlObjectModel)
      if (markdown === null) assert.fail()

      const parsedMermaid = await parseMermaid(markdown)

      expect(parsedMermaid).to.deep.equal({ diagramType: 'class', config: {} })
    })
    it('should return null for a empty Dtdl model', () => {
      expect(classDiagram.generateMarkdown({})).to.equal(null)
    })
  })
  describe('interfaceToMarkdown', () => {
    it('should return a list of mermaid markdown string that represents an interface ', () => {
      const interfaceAsMarkdown = classDiagram.interfaceToMarkdown(
        mockDtdlObjectModel,
        mockDtdlObjectModel['dtmi:com:example_extended;1'] as InterfaceType
      )
      const test = [
        'class `dtmi:com:example_extended:1`["example extended"] \nclick `dtmi:com:example_extended:1` call getEntity()',
        '`dtmi:com:example_extended:1` <|-- `dtmi:com:example:1` : extends',
        'class `dtmi:com:example_extended:1`:::search',
      ]
      expect(interfaceAsMarkdown).to.deep.equal(test)
    })
    it('should return a list of mermaid markdown string that represents a relationship', () => {
      const propertyAsMarkdown = classDiagram.interfaceToMarkdown(
        mockDtdlObjectModel,
        mockDtdlModelWithProperty['dtmi:com:example;1'] as InterfaceType
      )
      const test = [
        'class `dtmi:com:example:1`["example 1"] \nclick `dtmi:com:example:1` call getEntity()',
        '`dtmi:com:example:1` : property 1',
        'class `dtmi:com:example:1`:::search',
      ]
      expect(propertyAsMarkdown).to.deep.equal(test)
    })
  })
  describe('relationshipToMarkdown', () => {
    it('should return a list of mermaid markdown string that represents a relationship', () => {
      const relationshipAsMarkdown = classDiagram.relationshipToMarkdown(
        mockDtdlObjectModel,
        mockDtdlObjectModel['dtmi:com:example_relationship;1'] as RelationshipType
      )
      const test = ['`dtmi:com:example:1` -- `dtmi:com:example_related:1` : A relationship']
      expect(relationshipAsMarkdown).to.deep.equal(test)
    })
    it('should return undefined for a relationship with an undefined interface', () => {
      const relationshipAsMarkdown = classDiagram.relationshipToMarkdown(
        mockDtdlObjectModel,
        mockDtdlObjectModel['dtmi:com:example_relationship_undefined_interface;1'] as RelationshipType
      )
      const test = []
      expect(relationshipAsMarkdown).to.deep.equal(test)
    })
  })
  describe('createNodeString', () => {
    it('should return node string without a callback defined', () => {
      const interfaceAsMarkdown = classDiagram.createNodeString(
        mockDtdlObjectModel['dtmi:com:example_extended;1'],
        false
      )
      const test = 'class `dtmi:com:example_extended:1`["example extended"] '
      expect(interfaceAsMarkdown).to.deep.equal(test)
    })
  })
  describe('createEdgeString', () => {
    it('should return edge string without a label', () => {
      const edgeStringWithoutLabel = classDiagram.createEdgeString(
        'dtmi:com:nodeTo;1',
        'dtmi:com:nodeFrom;1',
        arrowTypes.Association
      )
      const test = '`dtmi:com:nodeTo:1` --> `dtmi:com:nodeFrom:1` : extends'
      expect(edgeStringWithoutLabel).to.equal(test)
    })
  })
})

describe('extractClassNodeCoordinate', () => {
  let dom: JSDOM, document: Document, element: Element, labelElement: Element, pathElement: Element

  beforeEach(() => {
    dom = new JSDOM()
    document = dom.window.document
    element = document.createElement('g')
    labelElement = document.createElement('g')
    pathElement = document.createElement('path')
  })

  it('should extract the x and y coordinate from the transform attribute', () => {
    element.setAttribute('transform', 'translate(100, 50)')

    labelElement.classList.add('label-container', 'text')
    pathElement.setAttribute('d', 'M0 0 L100 0 L100 200 L0 200 L0 0')

    labelElement.appendChild(pathElement)
    element.appendChild(labelElement)

    const coordinates = extractClassNodeCoordinate(element)
    expect(coordinates).to.deep.equal({
      bottom: 250,
      height: 200,
      left: 100,
      right: 200,
      top: 50,
      width: 100,
      x: 100,
      y: 50,
    })
  })

  it('should throw if the expected children not occur on the g element', () => {
    element.setAttribute('transform', 'translate(100, 50)')
    labelElement.classList.add('label-container', 'text')
    element.appendChild(labelElement)

    expect(() => extractClassNodeCoordinate(element)).to.throw()
  })
})
