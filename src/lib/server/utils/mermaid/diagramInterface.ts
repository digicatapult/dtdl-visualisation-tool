import { DtdlEntity, DtdlModel } from '../../models/dtdlOmParser.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'

export type Direction = ` TD` | ` BT` | ` RL` | ` LR`

export type NarrowEntityType<T, N> = T extends { EntityKind: N } ? T : never

export type NarrowMappingFn<k extends DtdlEntity['EntityKind']> = (
  dtdlObjectModel: DtdlModel,
  entity: NarrowEntityType<DtdlEntity, k>
) => string[]

export type EntityTypeToMarkdownFn = {
  [k in DtdlEntity['EntityKind']]: NarrowMappingFn<k>
}

export interface IDiagram<D extends DiagramType> {
  get diagramType(): D
  generateMarkdown(dtdlObjectModel: DtdlModel, direction: Direction): string | null
}
