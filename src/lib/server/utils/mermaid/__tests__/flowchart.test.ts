import { expect } from 'chai'
import { describe, it } from 'mocha'
import { DtdlObjectModel } from '../../../../../../interop/DtdlOm'
import Flowchart, { Node, NodeType } from '../flowchart'

export const mockDtdlObjectModel = {
  '1': {
    Id: '1',
    displayName: {
      en: 'node 1',
    },
  },
  '2': {
    Id: '2',
    displayName: {
      en: 'node 2',
    },
    ChildOf: '1',
  },
} as unknown as DtdlObjectModel

export const nodes: Node[] = [
  {
    id: '1',
    name: 'node 1',
    nodeType: NodeType.Component,
  },
  {
    id: '2',
    name: 'node 2',
    nodeType: NodeType.Component,
  },
  {
    id: 'nodeWithNoName',
    name: undefined,
    nodeType: NodeType.Custom
  }
]

export const flowchartFixture = `flowchart TD\n\t1["node 1"]\n\t1 --- 2["node 2"]`

describe('Flowchart', () => {
  const flowchart = new Flowchart()
  it('should return a node string', () => {
    expect(flowchart.createNodeString(nodes[0])).to.equal(`1(("node 1"))`)
  })
  it('should return a node string without a name', () => {
    expect(flowchart.createNodeString(nodes[2])).to.equal(`nodeWithNoName`)
  })
  it('should return a relationship string between two nodes', () => {
    expect(flowchart.createEntityString(mockDtdlObjectModel['2'])).to.equal(`\n\t1 --- 2["node 2"]`)
  })
  it('should return a EntitySting with no relationship', () => {
    expect(flowchart.createEntityString(mockDtdlObjectModel['1'])).to.equal(`\n\t1["node 1"]`)
  })
  it('should return a flowchart in markdown', () => {
    expect(flowchart.getFlowchartMarkdown(mockDtdlObjectModel)).to.equal(flowchartFixture)
  })
})
