import { DtdlObjectModel, EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { DiagramType } from '../../models/mermaidDiagrams'
import { MermaidId } from '../../models/strings'

export type Direction = ` TD` | ` BT` | ` RL` | ` LR`

export type NarrowEntityType<T, N> = T extends { EntityKind: N } ? T : never

export type NarrowMappingFn<k extends EntityType['EntityKind']> = (
  dtdlObjectModel: DtdlObjectModel,
  entity: NarrowEntityType<EntityType, k>
) => string[]

export type EntityTypeToMarkdownFn = {
  [k in EntityType['EntityKind']]: NarrowMappingFn<k>
}

export interface IDiagram {
  diagramType: DiagramType
  entityKindToMarkdown: Partial<EntityTypeToMarkdownFn>
  generateMarkdown(dtdlObjectModel: DtdlObjectModel, direction: Direction, highlightNodeId?: MermaidId): string | null
  createNodeString(entity: EntityType, withClick: boolean): string
  createEdgeString(nodeFrom: string, nodeTo: string, stringType, label?: string): string
  relationshipToMarkdown(dtdlObjectModel: DtdlObjectModel, entity: RelationshipType): string[]
  interfaceToMarkdown(entity: InterfaceType): string[]
}
