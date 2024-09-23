import { expect } from 'chai'
import { describe, it } from 'mocha'
import Flowchart, { Node, NodeType } from '../flowchart'

const nodes: Node[] = [
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
]

describe('Flowchart', () => {
  const flowchart = new Flowchart()
  it('should return a node string', () => {
    expect(flowchart.createNodeString(nodes[0])).to.equal(`1(("node 1"))`)
  })
  // it('should return a relationship string between two nodes', () => {
  //   expect(flowchart.createRelationshipBetweenNodes(relationships[0])).to.equal(`\n\t1(("node 1")) --- 2(("node 2"))`)
  // })
  // it('should return a flowchart in markdown', () => {
  //   expect(flowchart.generateFlowchart(relationships, Direction.TopToBottom)).to.equal(flowchartFixture)
  // })
})
