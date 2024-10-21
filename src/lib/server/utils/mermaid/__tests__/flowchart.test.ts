import { DtdlObjectModel, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import Flowchart from '../flowchart'

const emptyEntityProperties = {
  SupplementalTypes: [],
  SupplementalProperties: {},
  UndefinedTypes: [],
  UndefinedProperties: {},
  description: {},
  languageMajorVersion: 2,
  ClassId: 'dtmi:dtdl:class:SomeClass;2',
}
const emptyInterfaceProperties = {
  contents: {},
  commands: {},
  components: {},
  properties: {},
  relationships: {},
  telemetries: {},
  extendedBy: [],
  schemas: [],
}

const emptyRelationshipProperties = {
  schema: '',
  properties: {},
  displayName: {},
  writable: false,
}

export const flowchartFixture = `flowchart TD
dtmi:com:example:1@{ shape: subproc, label: "example 1"}
click dtmi:com:example:1 getEntity
dtmi:com:example_extended:1@{ shape: subproc, label: "example extended"}
click dtmi:com:example_extended:1 getEntity
dtmi:com:example:1 ---  dtmi:com:example_extended:1
dtmi:com:example_related:1@{ shape: subproc, label: "example related"}
click dtmi:com:example_related:1 getEntity
dtmi:com:example:1 --- |A relationship| dtmi:com:example_related:1`

export const mockDtdlObjectModel = {
  'dtmi:com:example;1': {
    Id: 'dtmi:com:example;1',
    displayName: {
      en: 'example 1',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  'dtmi:com:example_extended;1': {
    Id: 'dtmi:com:example_extended;1',
    displayName: {
      en: 'example extended',
    },
    EntityKind: 'Interface',
    extends: ['dtmi:com:example;1'],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  'dtmi:com:example_related;1': {
    Id: 'dtmi:com:example_related;1',
    displayName: {
      en: 'example related',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  'dtmi:com:example_relationship;1': {
    Id: 'dtmi:com:example_relationship;1',
    name: 'A relationship',
    EntityKind: 'Relationship',
    ChildOf: 'dtmi:com:example;1',
    target: 'dtmi:com:example_related;1',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'dtmi:com:example_relationship_undefined_interface;1': {
    Id: 'dtmi:com:example_relationship;1',
    name: 'A relationship',
    EntityKind: 'Relationship',
    ChildOf: 'dtmi:com:example;1',
    target: 'dtmi:com:example_undefined_interface;1',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
} as DtdlObjectModel

describe('Mermaid', () => {
  describe('Flowchart', () => {
    const flowchart = new Flowchart()
    it('should return a flowchart in markdown', () => {
      expect(flowchart.getFlowchartMarkdown(mockDtdlObjectModel)).to.equal(flowchartFixture)
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
        mockDtdlObjectModel['dtmi:com:example_extended;1'] as InterfaceType
      )
      const test = [
        `dtmi:com:example_extended:1@{ shape: subproc, label: "example extended"}\nclick dtmi:com:example_extended:1 getEntity`,
        `dtmi:com:example:1 ---  dtmi:com:example_extended:1`,
      ]
      expect(interfaceAsMarkdown).to.deep.equal(test)
    })
    it('should return a list of mermaid markdown string that represents a relationship ', () => {
      const relationshipAsMarkdown = flowchart.relationshipToMarkdown(
        mockDtdlObjectModel,
        mockDtdlObjectModel['dtmi:com:example_relationship;1'] as RelationshipType
      )
      const test = [`dtmi:com:example:1 --- |A relationship| dtmi:com:example_related:1`]
      expect(relationshipAsMarkdown).to.deep.equal(test)
    })
    it('should return undefined for a relationship with an undefined interface', () => {
      const relationshipAsMarkdown = flowchart.relationshipToMarkdown(
        mockDtdlObjectModel,
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
  })
})
