import { DtdlObjectModel, EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { DtdlId, MermaidId } from '../../models/strings'

export enum Direction {
  TopToBottom = ' TD',
  BottomToTop = ' BT',
  RightToLeft = ' RL',
  LeftToRight = ' LR',
}

const entityKindToShape = {
  Interface: 'subproc',
  Default: 'rect',
}

export default class Flowchart {
  private graphDefinition = 'flowchart'
  private dtdlObjectModel: DtdlObjectModel

  private entityKindToMarkdown = {
    Interface: (entity: InterfaceType) => this.interfaceToMarkdown(entity),
    Relationship: (entity: RelationshipType) => this.relationshipToMarkdown(entity),
    Default: () => [],
  }

  constructor(dtdlObjectModel: DtdlObjectModel) {
    this.dtdlObjectModel = dtdlObjectModel
  }

  /*
    IDs have format `dtmi:<domain>:<unique-model-identifier>;<model-version-number>`
    Mermaid IDs can't contain semicolons, so replace final semicolon with a colon.
  */
  dtdlIdReplaceSemicolon(idWithSemicolon: DtdlId): MermaidId {
    return idWithSemicolon.replace(/;(?=\d+$)/, ':') // replace final ; with :
  }

  dtdlIdReinstateSemicolon(idWithColon: MermaidId): DtdlId {
    return idWithColon.replace(/:(?=\d+$)/, ';') // replace final : with ;
  }

  displayNameWithBorders(displayName: string, entityKind: string) {
    const shapeTemplate = entityKindToShape[entityKind] || entityKindToShape.Default
    return `@{ shape: ${shapeTemplate}, label: "${displayName}"}`
  }

  createNodeString(entity: EntityType, withClick: boolean = true): string {
    const displayName = entity.displayName?.en ?? entity.Id
    const mermaidSafeId = this.dtdlIdReplaceSemicolon(entity.Id)
    let entityMarkdown = mermaidSafeId
    entityMarkdown += this.displayNameWithBorders(displayName, entity.EntityKind)
    entityMarkdown += withClick ? `\nclick ${mermaidSafeId} getEntity` : ``

    return entityMarkdown
  }

  createEdgeString(nodeFrom: string, nodeTo: string, label?: string): string {
    return `${this.dtdlIdReplaceSemicolon(nodeFrom)} --- ${label ? '|' + label + '|' : ``} ${this.dtdlIdReplaceSemicolon(nodeTo)}`
  }

  relationshipToMarkdown(entity: RelationshipType): string[] {
    const graph: string[] = []
    if (entity.ChildOf && entity.target && entity.target in this.dtdlObjectModel) {
      graph.push(this.createEdgeString(entity.ChildOf, entity.target, entity.name))
    }
    return graph
  }

  interfaceToMarkdown(entity: InterfaceType): string[] {
    const graph: string[] = []
    graph.push(this.createNodeString(entity))
    entity.extends.map((parent) => {
      graph.push(this.createEdgeString(parent, entity.Id))
    })
    return graph
  }

  getFlowchartMarkdown(direction: Direction = Direction.TopToBottom): string {
    const graph: string[] = [`${this.graphDefinition}${direction}`]
    for (const entity in this.dtdlObjectModel) {
      const entityObject: EntityType = this.dtdlObjectModel[entity]
      const markdown = this.entityKindToMarkdown[entityObject.EntityKind] || this.entityKindToMarkdown.Default
      graph.push(...markdown(entityObject))
    }
    return graph.join('\n')
  }
}
