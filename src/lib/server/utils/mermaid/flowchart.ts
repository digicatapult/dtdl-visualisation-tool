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

export default class Flowchart {
  private graphDefinition = 'flowchart'

  constructor() {}

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

  createEntityString(entity: EntityType, withClick?: boolean): string {
    const displayName = entity.displayName?.en ?? entity.Id
    const mermaidSafeId = this.dtdlIdReplaceSemicolon(entity.Id)
    let entityMarkdown = mermaidSafeId
    entityMarkdown += this.displayNameWithBorders(displayName, entity.EntityKind)
    entityMarkdown += withClick ? `\nclick ${mermaidSafeId} callback\n` : ``

    if (entity.ChildOf) {
      const parentId = this.dtdlIdReplaceSemicolon(entity.ChildOf)
      return `${parentId} --- ${entityMarkdown}`
    }

    return entityMarkdown
  }

  getFlowchartMarkdown(dtdlObjectModel: DtdlObjectModel, direction: Direction = Direction.TopToBottom): string {
    const tmp: Array<string> = [`${this.graphDefinition}${direction}`]
    for (const entity in dtdlObjectModel) {
      tmp.push(this.createEntityString(dtdlObjectModel[entity], true))
    }
    const md = tmp.join('\n')
    return md
  }
}
