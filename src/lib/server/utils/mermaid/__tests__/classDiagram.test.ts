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
        '`dtmi:com:example_extended:1` <|-- `dtmi:com:example:1`',
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
        '`dtmi:com:example:1` : example_property',
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
      const test = ['`dtmi:com:example:1` --> `dtmi:com:example_related:1` : A relationship']
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
      const test = '`dtmi:com:nodeTo:1` --> `dtmi:com:nodeFrom:1`'
      expect(edgeStringWithoutLabel).to.equal(test)
    })
  })
})

describe('extractClassNodeCoordinate', () => {
  let dom: JSDOM, document: Document, element: Element, labelElement: Element, membersElement: Element

  beforeEach(() => {
    dom = new JSDOM()
    document = dom.window.document
    element = document.createElement('g')
    labelElement = document.createElement('g')
    membersElement = document.createElement('g')
  })

  it('should extract the x and y coordinate from the transform attribute', () => {
    // class diagram
    labelElement.setAttribute('transform', 'translate(0,20)')
    membersElement.setAttribute('transform', 'translate(10,0)')

    labelElement.classList.add('label-group', 'text')
    membersElement.classList.add('members-group', 'text')

    element.appendChild(labelElement)
    element.appendChild(membersElement)

    const coordinates = extractClassNodeCoordinate(element)
    expect(coordinates).to.deep.equal({ x: -10, y: 20 })
  })
  it('should return {x: 0, y: 0} if the x and y coordinates do not exist in children element attributes of a given element', () => {
    // class diagram
    const zeroCoordinates = { x: 0, y: 0 }
    expect(extractClassNodeCoordinate(element)).to.deep.equal(zeroCoordinates)

    labelElement.classList.add('label-group')
    labelElement.classList.add('text')

    membersElement.classList.add('members-group')
    membersElement.classList.add('text')

    element.appendChild(labelElement)
    element.appendChild(membersElement)

    expect(extractClassNodeCoordinate(element)).to.deep.equal(zeroCoordinates)

    labelElement.setAttribute('transform', 'translate(x,y)')
    membersElement.setAttribute('transform', 'translate(x,y)')

    expect(extractClassNodeCoordinate(element)).to.deep.equal(zeroCoordinates)
  })
})
