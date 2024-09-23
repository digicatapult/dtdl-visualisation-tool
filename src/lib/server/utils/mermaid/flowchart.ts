import { singleton } from 'tsyringe'
import { DtdlObjectModel, EntityType } from '../../../../../interop/DtdlOm'

export enum Direction {
  TopToBottom = ' TD',
  BottomToTop = ' BT',
  RightToLeft = ' RL',
  LeftToRight = ' LR',
}

export enum NodeType {
  Interface = '[["<>"]]',
  Component = '(("<>"))',
  Custom = '["<>"]',
}

export type Node = {
  id: string
  name: string
  nodeType: NodeType
}

@singleton()
export default class Flowchart {
  private graphDefinition = 'flowchart'

  constructor() {}

  createNodeString(node: Node): string {
    const type_prefix = node.nodeType.split('<>')[0]
    const type_suffix = node.nodeType.split('<>')[1]
    const id = node.id.split(';')[0]
    return `${id}${type_prefix}${node.name}${type_suffix}`
  }

  createEntityString(entity: EntityType): string {
    const entityAsNodeString: string = this.createNodeString({
      id: entity.Id,
      name: entity.displayName.toHTMLString,
      nodeType: NodeType.Component,
    })
    if (entity.ChildOf) {
      return `\n\t${entity.ChildOf.split(';')[0]} --- ${entityAsNodeString}`
    }
    return `\n\t${entityAsNodeString}`
  }

  getFlowchartMarkdown(dtdlObjectModel: DtdlObjectModel, direction: Direction = Direction.TopToBottom): string {
    const tmp: Array<string> = [this.graphDefinition, direction]
    for (const entity in dtdlObjectModel) {
      tmp.push(this.createEntityString(dtdlObjectModel[entity]))
    }
    return tmp.join('')
  }
}
