import { DtdlObjectModel, EntityType } from '@digicatapult/dtdl-parser'
import { DiagramType } from '../../models/mermaidDiagrams'

export type Direction = ` TD` | ` BT` | ` RL` | ` LR`

export type NarrowEntityType<T, N> = T extends { EntityKind: N } ? T : never

export type NarrowMappingFn<k extends EntityType['EntityKind']> = (
  dtdlObjectModel: DtdlObjectModel,
  entity: NarrowEntityType<EntityType, k>
) => string[]

export type EntityTypeToMarkdownFn = {
  [k in EntityType['EntityKind']]: NarrowMappingFn<k>
}

export interface IDiagram<D extends DiagramType> {
  get diagramType(): D
  generateMarkdown(dtdlObjectModel: DtdlObjectModel, direction: Direction): string | null
}
