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

  /*
    IDs have format `dtmi:<domain>:<unique-model-identifier>;<model-version-number>`
    Mermaid IDs can't contain semicolons, so replace final semicolon with a colon.
  */
  private dtdlIdReplaceSemicolon(idWithSemicolon: string): string {
    return idWithSemicolon.replace(/;(?=\d+$)/, ':') // replace final ; with :
  }

  dtdlIdReintroduceSemicolon(idWithColon: string): string {
    return idWithColon.replace(/:(?=\d+$)/, ';') // replace final : with ;
  }

  private displayNameWithBorders(displayName: string, entityKind: string) {
    const shapeTemplate = entityKindToShape[entityKind] || entityKindToShape.Default
    return shapeTemplate.replace('<>', displayName)
  }

  private createEntityString(entity: EntityType): string {
    const displayName = entity.displayName?.en ?? entity.Id
    const mermaidSafeId = this.dtdlIdReplaceSemicolon(entity.Id)
    const entityMarkdown = `${mermaidSafeId}${this.displayNameWithBorders(displayName, entity.EntityKind)}`
    const entityMarkdownWithClick = `${entityMarkdown}\nclick ${mermaidSafeId} callback\n`

    if (entity.ChildOf) {
      const parentId = this.dtdlIdReplaceSemicolon(entity.ChildOf)
      return `${parentId} --- ${entityMarkdownWithClick}`
    }

    return entityMarkdownWithClick
  }

  getFlowchartMarkdown(dtdlObjectModel: DtdlObjectModel, direction: Direction = Direction.TopToBottom): string {
    const tmp: Array<string> = [`${this.graphDefinition}${direction}`]
    for (const entity in dtdlObjectModel) {
      tmp.push(this.createEntityString(dtdlObjectModel[entity]))
    }
    const md = tmp.join('\n')
    console.log(md)
    return md
  }
}
