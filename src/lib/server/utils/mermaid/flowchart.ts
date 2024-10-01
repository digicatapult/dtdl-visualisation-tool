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
  name: string | undefined
  nodeType: NodeType
}

export default class Flowchart {
  private graphDefinition = 'flowchart'

  constructor() {}

  createNodeString(node: Node): string {
    const type_prefix = node.nodeType.split('<>')[0]
    const type_suffix = node.nodeType.split('<>')[1]
    const id = node.id.split(';')[0]
    if (!node.name) {
      node.name = id
    }
    return `${id}${type_prefix}${node.name}${type_suffix}`
  }

  getNodeType(entityKind: EntityType['EntityKind']): NodeType {
    switch (entityKind) {
      case 'Component':
        return NodeType.Component
      case 'Interface':
        return NodeType.Interface
      default:
        return NodeType.Custom
    }
  }

  createEntityString(entity: EntityType): string {
    const entityAsNodeString: string = this.createNodeString({
      id: entity.Id,
      name: entity.displayName ? entity.displayName.en : undefined,
      nodeType: this.getNodeType(entity.EntityKind),
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
