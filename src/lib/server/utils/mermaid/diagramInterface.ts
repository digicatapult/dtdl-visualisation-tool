import { DtdlObjectModel, EntityType } from '@digicatapult/dtdl-parser'
import { DiagramType } from '../../models/mermaidDiagrams'
import { MermaidId } from '../../models/strings'
import { DtdlModelWithMetadata } from '../dtdl/filter'

export type Direction = ` TD` | ` BT` | ` RL` | ` LR`

export type NarrowEntityType<T, N> = T extends { EntityKind: N } ? T : never

export type NarrowMappingFn<k extends EntityType['EntityKind']> = (
  dtdlModelWithMetadata: DtdlModelWithMetadata,
  entity: NarrowEntityType<EntityType, k>
) => string[]

export type EntityTypeToMarkdownFn = {
  [k in EntityType['EntityKind']]: NarrowMappingFn<k>
}

export interface IDiagram<D extends DiagramType> {
  get diagramType(): D
  generateMarkdown(dtdlObjectModel: DtdlObjectModel, direction: Direction, highlightNodeId?: MermaidId): string | null
}
