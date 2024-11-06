import { InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import ClassDiagram, { ArrowType } from '../classDiagram'
import {
  classDiagramFixture,
  emptyModel,
  mockDtdlModellWithMetadata,
  mockDtdlModelWithProperty,
  mockDtdlObjectModel,
} from './fixtures'

describe('ClassDiagram', () => {
  const classDiagram = new ClassDiagram()
  describe('generateMarkdown', () => {
    it('should return a flowchart in markdown', () => {
      expect(classDiagram.generateMarkdown(mockDtdlModellWithMetadata)).to.equal(classDiagramFixture)
    })
    it('should return null for a empty Dtdl model', () => {
      expect(classDiagram.generateMarkdown(emptyModel)).to.equal(null)
    })
  })
  describe('interfaceToMarkdown', () => {
    it('should return a list of mermaid markdown string that represents an interface ', () => {
      const interfaceAsMarkdown = classDiagram.interfaceToMarkdown(
        mockDtdlModellWithMetadata,
        mockDtdlObjectModel['dtmi:com:example_extended;1'] as InterfaceType
      )
      const test = [
        'class `dtmi:com:example_extended:1`["example extended"] \nclick `dtmi:com:example_extended:1` call getEntity()',
        '`dtmi:com:example_extended:1` <|-- `dtmi:com:example:1`',
      ]
      expect(interfaceAsMarkdown).to.deep.equal(test)
    })
    it('should return a list of mermaid markdown string that represents a relationship ', () => {
      const propertyAsMarkdown = classDiagram.interfaceToMarkdown(
        mockDtdlModellWithMetadata,
        mockDtdlModelWithProperty['dtmi:com:example;1'] as InterfaceType
      )
      const test = [
        'class `dtmi:com:example:1`["example 1"] \nclick `dtmi:com:example:1` call getEntity()',
        '`dtmi:com:example:1` : example_property',
      ]
      expect(propertyAsMarkdown).to.deep.equal(test)
    })
  })
  describe('relationshipToMarkdown', () => {
    it('should return a list of mermaid markdown string that represents a relationship ', () => {
      const relationshipAsMarkdown = classDiagram.relationshipToMarkdown(
        mockDtdlModellWithMetadata,
        mockDtdlObjectModel['dtmi:com:example_relationship;1'] as RelationshipType
      )
      const test = ['`dtmi:com:example:1` --> `dtmi:com:example_related:1` : A relationship']
      expect(relationshipAsMarkdown).to.deep.equal(test)
    })
    it('should return undefined for a relationship with an undefined interface', () => {
      const relationshipAsMarkdown = classDiagram.relationshipToMarkdown(
        mockDtdlModellWithMetadata,
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
        ArrowType.Association
      )
      const test = '`dtmi:com:nodeTo:1` --> `dtmi:com:nodeFrom:1`'
      expect(edgeStringWithoutLabel).to.equal(test)
    })
  })
})
