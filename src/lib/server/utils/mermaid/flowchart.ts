import { singleton } from 'tsyringe'

export type DtdlObjectModel = { [entityId: string]: EntityType }

export type EntityType = EntityInfo 

export interface EntityInfo {
  EntityKind:
    | 'Array'
    | 'Boolean'
    | 'Command'
    | 'CommandPayload'
    | 'CommandType'
    | 'Component'
    | 'Date'
    | 'DateTime'
    | 'Double'
    | 'Duration'
    | 'Enum'
    | 'EnumValue'
    | 'Field'
    | 'Float'
    | 'Integer'
    | 'Interface'
    | 'Long'
    | 'Map'
    | 'MapKey'
    | 'MapValue'
    | 'Object'
    | 'Property'
    | 'Relationship'
    | 'String'
    | 'Telemetry'
    | 'Time'
    | 'CommandRequest'
    | 'CommandResponse'
    | 'Unit'
    | 'UnitAttribute'
    | 'LatentType'
    | 'NamedLatentType'
  SupplementalTypes: string[]
  SupplementalProperties: { [property: string]: object }
  UndefinedTypes: string[]
  UndefinedProperties: { [property: string]: object }
  ClassId: string
  comment?: string
  description: { [languageCode: string]: string }
  displayName: { [languageCode: string]: string }
  languageMajorVersion: number
  Id: string
  ChildOf?: string
  DefinedIn?: string
}

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
    return node.id + type_prefix + node.name + type_suffix
  }

  createEntityString(entity: EntityInfo): string {
    const entityAsNodeString: string = this.createNodeString({
      id: entity.Id,
      name: entity.displayName.en,
      nodeType: NodeType.Component,
    })
    if (entity.ChildOf) {
      return `\n\t${entity.ChildOf} --- ${entityAsNodeString}`
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
