import { DtdlObjectModel, EntityType } from '../../../../../interop/DtdlOm'

export enum Direction {
  TopToBottom = ' TD',
  BottomToTop = ' BT',
  RightToLeft = ' RL',
  LeftToRight = ' LR',
}

const entityKindToShape = {
  Interface: '[["<>"]]',
  Component: '(("<>"))',
  Custom: '["<>"]',
  Default: '["<>"]',
}

export type Node = {
  id: string
  name: string | undefined
  flowchartShape: string
}

export default class Flowchart {
  private graphDefinition = 'flowchart'

  constructor() {}

  createNodeString(node: Node): string {
    const id = node.id.split(';')[0]
    const displayName = node.name ?? id
    const nameWithBorders = node.flowchartShape.replace('<>', displayName)
    return `${id}${nameWithBorders}`
  }

  createEntityString(entity: EntityType): string {
    const entityAsNodeString: string = this.createNodeString({
      id: entity.Id,
      name: entity.displayName?.en,
      flowchartShape: entityKindToShape[entity.EntityKind] || entityKindToShape.Default,
    })
    if (entity.ChildOf) {
      return `\n\t${entity.ChildOf.split(';')[0]} --- ${entityAsNodeString}`
    }

    const string = `\n\t${entityAsNodeString}
        click dtmi:com:example callback
      `
    console.log(string)
    return string
  }

  getFlowchartMarkdown(dtdlObjectModel: DtdlObjectModel, direction: Direction = Direction.TopToBottom): string {
    const tmp: Array<string> = [this.graphDefinition, direction]
    for (const entity in dtdlObjectModel) {
      tmp.push(this.createEntityString(dtdlObjectModel[entity]))
    }
    const md = tmp.join('')
    console.log(md)
    return md
  }
}
