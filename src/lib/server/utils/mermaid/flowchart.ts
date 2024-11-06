import { EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { MermaidId } from '../../models/strings.js'
import { getDisplayName } from '../dtdl/extract.js'
import { DtdlModelWithMetadata } from '../dtdl/filter.js'
import { Direction, EntityTypeToMarkdownFn, IDiagram, NarrowMappingFn } from './diagramInterface.js'
import { defaultMarkdownFn, dtdlIdReinstateSemicolon, dtdlIdReplaceSemicolon, getOutlineClass } from './helpers.js'

const entityKindToShape = {
  Interface: 'subproc',
  Default: 'rect',
}

export default class Flowchart implements IDiagram<'flowchart'> {
  get diagramType(): 'flowchart' {
    return 'flowchart'
  }

  entityKindToMarkdown: Partial<EntityTypeToMarkdownFn> = {
    Interface: (dtdlModelWithMetadata, entity) => this.interfaceToMarkdown(dtdlModelWithMetadata, entity),
    Relationship: (dtdlModelWithMetadata, entity) => this.relationshipToMarkdown(dtdlModelWithMetadata, entity),
  }

  constructor() {}

  displayNameWithBorders(displayName: string, entityKind: string) {
    const shapeTemplate = entityKindToShape[entityKind] || entityKindToShape.Default
    return `@{ shape: ${shapeTemplate}, label: "${displayName}"}` // TODO: looks like an injection risk
  }

  createNodeString(entity: EntityType, withClick: boolean = true): string {
    const displayName = getDisplayName(entity)
    const mermaidSafeId = dtdlIdReplaceSemicolon(entity.Id)
    let entityMarkdown = mermaidSafeId
    entityMarkdown += this.displayNameWithBorders(displayName, entity.EntityKind)
    entityMarkdown += withClick ? `\nclick ${mermaidSafeId} getEntity` : ``

    return entityMarkdown
  }

  createEdgeString(nodeFrom: string, nodeTo: string, label?: string): string {
    return `${dtdlIdReplaceSemicolon(nodeFrom)} --- ${label ? '|' + label + '|' : ``} ${dtdlIdReplaceSemicolon(nodeTo)}`
  }

  relationshipToMarkdown(dtdlModelWithMetadata: DtdlModelWithMetadata, entity: RelationshipType): string[] {
    const graph: string[] = []
    if (entity.ChildOf && entity.target && entity.target in dtdlModelWithMetadata.model) {
      graph.push(this.createEdgeString(entity.ChildOf, entity.target, entity.name))
    }
    return graph
  }

  interfaceToMarkdown(dtdlModelWithMetadata: DtdlModelWithMetadata, entity: InterfaceType): string[] {
    const graph: string[] = []
    graph.push(this.createNodeString(entity))
    entity.extends.map((parent) => {
      graph.push(this.createEdgeString(parent, entity.Id))
    })

    graph.push(`class ${dtdlIdReplaceSemicolon(entity.Id)} ${getOutlineClass(dtdlModelWithMetadata, entity.Id)}`)

    return graph
  }

  generateMarkdown(
    dtdlModelWithMetadata: DtdlModelWithMetadata,
    direction: Direction = ' TD',
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
    if (highlightNodeId && dtdlIdReinstateSemicolon(highlightNodeId) in model) {
      graph.push(`\nclass ${highlightNodeId} highlighted`)
    }

    if (graph.length === 0) {
      return null
    }
    return `${this.diagramType}${direction}\n${graph.join('\n')}`
  }
}
