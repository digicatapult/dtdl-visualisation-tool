import { DtdlObjectModel, EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { MermaidId } from '../../models/strings.js'
import { getDisplayName } from '../dtdl/extract.js'
import { getVisualisationState } from '../dtdl/filter.js'
import { Direction, EntityTypeToMarkdownFn, IDiagram, NarrowMappingFn } from './diagramInterface.js'
import { defaultMarkdownFn, dtdlIdReinstateSemicolon, dtdlIdReplaceSemicolon } from './helpers.js'

const entityKindToShape = {
  Interface: 'rect',
  Default: 'rect',
}

export const extractFlowchartNodeCoordinates = (element: Element): { x: number; y: number } => {
  const rect = element.querySelector('rect')

  if (!rect) return { x: 0, y: 0 }

  const x = parseFloat(rect.getAttribute('x') || '0')
  const y = parseFloat(rect.getAttribute('y') || '0')
  const width = parseFloat(rect.getAttribute('width') || '0')

  return {
    x: x + width - 5,
    y: y + 20,
  }
}

export default class Flowchart implements IDiagram<'flowchart'> {
  get diagramType(): 'flowchart' {
    return 'flowchart'
  }

  entityKindToMarkdown: Partial<EntityTypeToMarkdownFn> = {
    Interface: (dtdlObjectModel, entity) => this.interfaceToMarkdown(dtdlObjectModel, entity),
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

  relationshipToMarkdown(dtdlObjectModel: DtdlObjectModel, entity: RelationshipType) {
    // if we don't have both sides of the relationship don't render it
    if (!entity.ChildOf || !entity.target || !(entity.target in dtdlObjectModel)) {
      return []
    }
    return [this.createEdgeString(entity.ChildOf, entity.target, entity.name)]
  }

  interfaceToMarkdown(dtdlObjectModel: DtdlObjectModel, entity: InterfaceType) {
    return [
      this.createNodeString(entity),
      ...entity.extends
        .filter((parent) => !!dtdlObjectModel[parent])
        .map((parent) => this.createEdgeString(parent, entity.Id, 'extends')),
      `class ${dtdlIdReplaceSemicolon(entity.Id)} ${getVisualisationState(entity)}`,
    ]
  }

  generateMarkdown(
    dtdlObjectModel: DtdlObjectModel,
    direction: Direction = ' TD',
    highlightNodeId?: MermaidId
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
