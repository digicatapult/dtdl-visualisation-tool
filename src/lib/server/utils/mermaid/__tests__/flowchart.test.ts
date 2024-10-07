import { expect } from 'chai'
import { describe, it } from 'mocha'
import { DtdlObjectModel } from '../../../../../../interop/DtdlOm'
import Flowchart from '../flowchart'

const emptyProperties = {
  SupplementalTypes: [],
  SupplementalProperties: {},
  UndefinedTypes: [],
  UndefinedProperties: {},
  description: {},
  languageMajorVersion: 2,
}

export const mockDtdlObjectModel = {
  'dtmi:com:example;1': {
    Id: 'dtmi:com:example;1',
    displayName: {
      en: 'node 1',
    },
    EntityKind: 'Component',
    ClassId: 'dtmi:dtdl:class:Component;2',
    ...emptyProperties,
  },
  'dtmi:com:example;2': {
    Id: 'dtmi:com:example;2',
    displayName: {
      en: 'node 2',
    },
    EntityKind: 'Interface',
    ChildOf: 'dtmi:com:example;1',
    ClassId: 'dtmi:dtdl:class:Interface;2',
    ...emptyProperties,
  },
  'dtmi:com:example;3': {
    Id: 'dtmi:com:example;3',
    displayName: {
      fr: 'é',
    },
    EntityKind: 'Property',
    ClassId: 'dtmi:dtdl:class:Property;2',
    ...emptyProperties,
  },
} as DtdlObjectModel

export const flowchartFixture = `flowchart TD\ndtmi:com:example:1(("node 1"))\nclick dtmi:com:example:1 getEntity\n\ndtmi:com:example:1 --- dtmi:com:example:2[["node 2"]]\nclick dtmi:com:example:2 getEntity\n\ndtmi:com:example:3["dtmi:com:example;3"]\nclick dtmi:com:example:3 getEntity\n`

describe('Flowchart', () => {
  const flowchart = new Flowchart()
  it('should return an entity string', () => {
    expect(flowchart.createEntityString(mockDtdlObjectModel['dtmi:com:example;1'])).to.equal(
      `dtmi:com:example:1(("node 1"))`
    )
  })
  it('should return an entity string without a name', () => {
    expect(flowchart.createEntityString(mockDtdlObjectModel['dtmi:com:example;3'])).to.equal(
      `dtmi:com:example:3["dtmi:com:example;3"]`
    )
  })
  it('should return a relationship string between two nodes', () => {
    expect(flowchart.createEntityString(mockDtdlObjectModel['dtmi:com:example;2'])).to.equal(
      `dtmi:com:example:1 --- dtmi:com:example:2[["node 2"]]`
    )
  })
  it('should return a EntitySting with no relationship', () => {
    expect(flowchart.createEntityString(mockDtdlObjectModel['dtmi:com:example;1'])).to.equal(
      `dtmi:com:example:1(("node 1"))`
    )
  })
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
})
