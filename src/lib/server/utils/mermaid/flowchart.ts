import { EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'

import { DtdlId, MermaidId } from '../../models/strings.js'
import { getDisplayName } from '../dtdl/extract.js'
import { DtdlModelWithMetadata } from '../dtdl/filter.js'

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
  dtdlModelWithMetadata: DtdlModelWithMetadata,
  entity: NarrowEntityType<EntityType, k>
) => string[]

type EntityTypeToMarkdownFn = {
  [k in EntityType['EntityKind']]: NarrowMappingFn<k>
}
const defaultMarkdownFn = (): string[] => []

export default class Flowchart {
  private graphDefinition = 'flowchart'

  private entityKindToMarkdown: Partial<EntityTypeToMarkdownFn> = {
    Interface: (dtdlModelWithMetadata, entity) => this.interfaceToMarkdown(dtdlModelWithMetadata, entity),
    Relationship: (dtdlModelWithMetadata, entity) => this.relationshipToMarkdown(dtdlModelWithMetadata, entity),
  }

  constructor() {}

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

  relationshipToMarkdown(dtdlModelWithMetadata: DtdlModelWithMetadata, entity: RelationshipType): string[] {
    const graph: string[] = []
    if (entity.ChildOf && entity.target && entity.target in dtdlModelWithMetadata.model) {
      graph.push(this.createEdgeString(entity.ChildOf, entity.target, entity.name))
    }
    return graph
  }

  getInterfaceOutlineClass(dtdlModelWithMetadata: DtdlModelWithMetadata, entityId: DtdlId): string {
    if (dtdlModelWithMetadata.metadata.searchResults?.includes(entityId)) {
      return `search-result`
    }
    if (dtdlModelWithMetadata.metadata.expanded?.includes(entityId)) {
      return `expanded`
    }
    return `unexpanded`
  }

  interfaceToMarkdown(dtdlModelWithMetadata: DtdlModelWithMetadata, entity: InterfaceType): string[] {
    const graph: string[] = []
    graph.push(this.createNodeString(entity))
    entity.extends.map((parent) => {
      graph.push(this.createEdgeString(parent, entity.Id))
    })

    graph.push(
      `\nclass ${this.dtdlIdReplaceSemicolon(entity.Id)} ${this.getInterfaceOutlineClass(dtdlModelWithMetadata, entity.Id)}`
    )

    return graph
  }

  getFlowchartMarkdown(
    dtdlModelWithMetadata: DtdlModelWithMetadata,
    direction: Direction = Direction.TopToBottom,
    highlightNodeId?: MermaidId
  ): string | null {
    const { model } = dtdlModelWithMetadata
    const graph: string[] = []
    for (const entity in model) {
      const entityObject: EntityType = model[entity]
      const markdown = (this.entityKindToMarkdown[entityObject.EntityKind] || defaultMarkdownFn) as NarrowMappingFn<
        (typeof entityObject)['EntityKind']
      >
      graph.push(...markdown(dtdlModelWithMetadata, entityObject))
    }
    if (highlightNodeId && this.dtdlIdReinstateSemicolon(highlightNodeId) in model) {
      graph.push(`\nclass ${highlightNodeId} highlighted`)
    }

    if (graph.length === 0) {
      return null
    }
    return `${this.graphDefinition}${direction}\n${graph.join('\n')}`
  }
}
