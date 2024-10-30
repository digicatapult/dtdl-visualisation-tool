import { DtdlObjectModel, EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { MermaidId } from '../../models/strings.js'
import { getDisplayName } from '../dtdl/extract.js'
import { defaultMarkdownFn, dtdlIdReinstateSemicolon, dtdlIdReplaceSemicolon } from './helpers.js'
import { EntityTypeToMarkdownFn, IDiagram, NarrowMappingFn, Direction } from './diagramInterface.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'


const entityKindToShape = {
  Interface: 'subproc',
  Default: 'rect',
}

export default class Flowchart implements IDiagram {
  diagramType: DiagramType = 'flowchart'

  entityKindToMarkdown: Partial<EntityTypeToMarkdownFn> = {
    Interface: (_, entity) => this.interfaceToMarkdown(entity),
    Relationship: (dtdlObjectModel, entity) => this.relationshipToMarkdown(dtdlObjectModel, entity),
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

  generateMarkdown(
    dtdlObjectModel: DtdlObjectModel,
    highlightNodeId?: MermaidId,
    direction: Direction = ' TD'
  ): string | null {
    const graph: string[] = []
    for (const entity in dtdlObjectModel) {
      const entityObject: EntityType = dtdlObjectModel[entity]
      const markdown = (this.entityKindToMarkdown[entityObject.EntityKind] || defaultMarkdownFn) as NarrowMappingFn<
        (typeof entityObject)['EntityKind']
      >
      graph.push(...markdown(dtdlObjectModel, entityObject))
    }
    if (highlightNodeId && dtdlIdReinstateSemicolon(highlightNodeId) in dtdlObjectModel) {
      graph.push(`\nclass ${highlightNodeId} highlighted`)
    }
    if (graph.length === 0) {
      return null
    }
    return `${this.diagramType}${direction}\n${graph.join('\n')}`
  }
}
