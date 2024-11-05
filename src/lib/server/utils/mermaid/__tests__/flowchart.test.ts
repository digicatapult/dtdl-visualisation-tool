import { InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import Flowchart from '../flowchart'
import { flowchartFixture, mockDtdlModellWithMetadata, mockDtdlObjectModel } from './fixtures'

describe('Mermaid', () => {
  describe('Flowchart', () => {
    const flowchart = new Flowchart()
    it('should return a flowchart in markdown', () => {
      expect(flowchart.getFlowchartMarkdown(mockDtdlModellWithMetadata)).to.equal(flowchartFixture)
    })
    it('should replace the final semicolon in DTDL ID', () => {
      expect(flowchart.dtdlIdReplaceSemicolon('dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal;1')).to.equal(
        'dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal:1'
      )
    })
    it('should replace the final semicolon in DTDL ID with any number after the final semicolon', () => {
      expect(flowchart.dtdlIdReplaceSemicolon('dtmi:com:example;12345')).to.equal('dtmi:com:example:12345')
    })
    it('should replace the final colon in a mermaid safe ID', () => {
      expect(flowchart.dtdlIdReinstateSemicolon('dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal:1')).to.equal(
        'dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal;1'
      )
    })
    it('should replace the final colon in in a mermaid safe ID with any number after the final colon', () => {
      expect(flowchart.dtdlIdReinstateSemicolon('dtmi:com:example:12345')).to.equal('dtmi:com:example;12345')
    })
    it('should return a list of mermaid markdown string that represent an interface ', () => {
      const interfaceAsMarkdown = flowchart.interfaceToMarkdown(
        mockDtdlModellWithMetadata,
        mockDtdlObjectModel['dtmi:com:example_extended;1'] as InterfaceType
      )
      const test = [
        `dtmi:com:example_extended:1@{ shape: subproc, label: "example extended"}\nclick dtmi:com:example_extended:1 getEntity`,
        `dtmi:com:example:1 ---  dtmi:com:example_extended:1`,
        `class dtmi:com:example_extended:1 search-result`,
      ]
      expect(interfaceAsMarkdown).to.deep.equal(test)
    })
    it('should return a list of mermaid markdown string that represents a relationship ', () => {
      const relationshipAsMarkdown = flowchart.relationshipToMarkdown(
        mockDtdlModellWithMetadata,
        mockDtdlObjectModel['dtmi:com:example_relationship;1'] as RelationshipType
      )
      const test = [`dtmi:com:example:1 --- |A relationship| dtmi:com:example_related:1`]
      expect(relationshipAsMarkdown).to.deep.equal(test)
    })
    it('should return undefined for a relationship with an undefined interface', () => {
      const relationshipAsMarkdown = flowchart.relationshipToMarkdown(
        mockDtdlModellWithMetadata,
        mockDtdlObjectModel['dtmi:com:example_relationship_undefined_interface;1'] as RelationshipType
      )
      const test = []
      expect(relationshipAsMarkdown).to.deep.equal(test)
    })
    it('should return node string without a callback defined', () => {
      const interfaceAsMarkdown = flowchart.createNodeString(mockDtdlObjectModel['dtmi:com:example_extended;1'], false)
      const test = 'dtmi:com:example_extended:1@{ shape: subproc, label: "example extended"}'
      expect(interfaceAsMarkdown).to.deep.equal(test)
    })

    it('should assign search-result class to interfaces if undefined search results (show all)', () => {
      const interfaceAsMarkdown = flowchart.interfaceToMarkdown(
        { ...mockDtdlModellWithMetadata, metadata: { expanded: [], searchResults: undefined } },
        mockDtdlObjectModel['dtmi:com:example;1'] as InterfaceType
      )
      expect(interfaceAsMarkdown[1]).to.deep.equal(`class dtmi:com:example:1 search-result`)
    })

    it('should assign search-result class to interfaces in search results', () => {
      const interfaceAsMarkdown = flowchart.interfaceToMarkdown(
        { ...mockDtdlModellWithMetadata, metadata: { expanded: [], searchResults: ['dtmi:com:example;1'] } },
        mockDtdlObjectModel['dtmi:com:example;1'] as InterfaceType
      )
      expect(interfaceAsMarkdown[1]).to.deep.equal(`class dtmi:com:example:1 search-result`)
    })

    it('should assign expanded class to interfaces in expanded', () => {
      const interfaceAsMarkdown = flowchart.interfaceToMarkdown(
        { ...mockDtdlModellWithMetadata, metadata: { expanded: ['dtmi:com:example;1'], searchResults: [''] } },
        mockDtdlObjectModel['dtmi:com:example;1'] as InterfaceType
      )
      expect(interfaceAsMarkdown[1]).to.deep.equal(`class dtmi:com:example:1 expanded`)
    })

    it('should assign unexpanded class to interfaces not present in metadata', () => {
      const interfaceAsMarkdown = flowchart.interfaceToMarkdown(
        { ...mockDtdlModellWithMetadata, metadata: { expanded: [''], searchResults: [''] } },
        mockDtdlObjectModel['dtmi:com:example;1'] as InterfaceType
      )
      expect(interfaceAsMarkdown[1]).to.deep.equal(`class dtmi:com:example:1 unexpanded`)
    })
  })
})
