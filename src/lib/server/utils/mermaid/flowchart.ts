import {
  DtdlObjectModel,
  EntityType,
  InterfaceType,
  RelationshipType,
} from '../../../../../interop/DtdlOm'

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

export default class Flowchart {
  private graphDefinition = 'flowchart'
  private dtdlObjectModel: DtdlObjectModel

  constructor(dtdlObjectModel: DtdlObjectModel) {
    this.dtdlObjectModel = dtdlObjectModel
  }

  /*
    IDs have format `dtmi:<domain>:<unique-model-identifier>;<model-version-number>`
    Mermaid IDs can't contain semicolons, so replace final semicolon with a colon.
  */
  dtdlIdReplaceSemicolon(idWithSemicolon: string): string {
    return idWithSemicolon.replace(/;(?=\d+$)/, ':') // replace final ; with :
  }

  dtdlIdReinstateSemicolon(idWithColon: string): string {
    return idWithColon.replace(/:(?=\d+$)/, ';') // replace final : with ;
  }

  displayNameWithBorders(displayName: string, entityKind: string) {
    const shapeTemplate = entityKindToShape[entityKind] || entityKindToShape.Default
    return shapeTemplate.replace('<>', displayName)
  }

  createNodeString(entity: EntityType, withClick: boolean = true): string {
    const displayName = entity.displayName?.en ?? entity.Id
    const mermaidSafeId = this.dtdlIdReplaceSemicolon(entity.Id)
    let entityMarkdown = mermaidSafeId
    entityMarkdown += this.displayNameWithBorders(displayName, entity.EntityKind)
    entityMarkdown += withClick ? `\nclick ${mermaidSafeId} getEntity\n` : ``

    return entityMarkdown
  }

  createEdgeString(nodeFrom: string, nodeTo: string, label?: string): string {
    return `${this.dtdlIdReplaceSemicolon(nodeFrom)} --- ${label && '|' + label + '|'} ${this.dtdlIdReplaceSemicolon(nodeTo)}`
  }

  relationshipToMarkdown(entity: RelationshipType): string | undefined {
    if (entity.ChildOf && entity.target && entity.target in this.dtdlObjectModel) {
      const parentEntity = this.dtdlIdReplaceSemicolon(entity.ChildOf)
      const childEntity = this.dtdlIdReplaceSemicolon(entity.ChildOf)
      const relationshipName = entity.name
      return this.createEdgeString(parentEntity, childEntity, relationshipName)
    }
  }

  interfaceToMarkdown(entity: InterfaceType): string[] {
    const tmp: string[] = []
    tmp.push(this.createNodeString(entity))
    for (const child of entity.extendedBy) {
      tmp.push(this.createEdgeString(entity.Id, child))
    }
    for (const parent of entity.extends) {
      tmp.push(this.createEdgeString(parent, entity.Id))
    }
    return tmp
  }


  getFlowchartMarkdown(direction: Direction = Direction.TopToBottom): string {
    const tmp: string[] = [`${this.graphDefinition}${direction}`]
    for (const entity in this.dtdlObjectModel) {
      const entityObject: EntityType = this.dtdlObjectModel[entity]
      switch (entityObject.EntityKind) {
        case 'Interface':
          tmp.push(...this.interfaceToMarkdown(entityObject as InterfaceType))
          break
        case 'Relationship':
          const relationshipMarkdown = this.relationshipToMarkdown(entityObject as RelationshipType)
          relationshipMarkdown && tmp.push(relationshipMarkdown)
          break
      }
    }
    return tmp.join('\n')
  }
}
