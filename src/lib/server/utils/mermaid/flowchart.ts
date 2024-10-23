import { DtdlObjectModel, EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'

import { DtdlId, MermaidId } from '../../models/strings.js'
import { getDisplayName } from '../dtdl/extract.js'

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

type NarrowEntityType<T, N> = T extends { EntityKind: N } ? T : never

type NarrowMappingFn<k extends EntityType['EntityKind']> = (
  dtdlObjectModel: DtdlObjectModel,
  entity: NarrowEntityType<EntityType, k>
) => string[]

type EntityTypeToMarkdownFn = {
  [k in EntityType['EntityKind']]: NarrowMappingFn<k>
}
const defaultMarkdownFn = (): string[] => []

export default class Flowchart {
  private graphDefinition = 'flowchart'

  private entityKindToMarkdown: Partial<EntityTypeToMarkdownFn> = {
    Interface: (_, entity) => this.interfaceToMarkdown(entity),
    Relationship: (dtdlObjectModel, entity) => this.relationshipToMarkdown(dtdlObjectModel, entity),
  }

  constructor() { }

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
    return `@{ shape: ${shapeTemplate}, label: "${displayName}"}` // TODO: looks like an injection risk
  }

  createNodeString(entity: EntityType, withClick: boolean = true): string {
    const displayName = getDisplayName(entity)
    const mermaidSafeId = this.dtdlIdReplaceSemicolon(entity.Id)
    let entityMarkdown = mermaidSafeId
    entityMarkdown += this.displayNameWithBorders(displayName, entity.EntityKind)
    entityMarkdown += withClick ? `\nclick ${mermaidSafeId} getEntity` : ``

    return entityMarkdown
  }

  createEdgeString(nodeFrom: string, nodeTo: string, label?: string): string {
    return `${this.dtdlIdReplaceSemicolon(nodeFrom)} --- ${label ? '|' + label + '|' : ``} ${this.dtdlIdReplaceSemicolon(nodeTo)}`
  }

  relationshipToMarkdown(dtdlObjectModel: DtdlObjectModel, entity: RelationshipType): string[] {
    const graph: string[] = []
    if (entity.ChildOf && entity.target && entity.target in dtdlObjectModel) {
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

  getFlowchartMarkdown(dtdlObjectModel: DtdlObjectModel, direction: Direction = Direction.TopToBottom, highlightNodeId?: MermaidId): string | null {
    const graph: string[] = []
    for (const entity in dtdlObjectModel) {
      const entityObject: EntityType = dtdlObjectModel[entity]
      const markdown = (this.entityKindToMarkdown[entityObject.EntityKind] || defaultMarkdownFn) as NarrowMappingFn<
        (typeof entityObject)['EntityKind']
      >
      graph.push(...markdown(dtdlObjectModel, entityObject))
      if (highlightNodeId && entityObject.Id == this.dtdlIdReinstateSemicolon(highlightNodeId)) {
        graph.push(`\nclass ${highlightNodeId} highlighted`)
      }
    }
    if (graph.length === 0) {
      return null
    }
    return `${this.graphDefinition}${direction}\n${graph.join('\n')}`
  }
}
