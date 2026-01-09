import { DtdlObjectModel, EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { InternalError } from '../../errors.js'
import { getDisplayName } from '../dtdl/extract.js'
import { getVisualisationState } from '../dtdl/filter.js'
import { Direction, EntityTypeToMarkdownFn, IDiagram, NarrowMappingFn } from './diagramInterface.js'
import { BoundingBox, defaultMarkdownFn, dtdlIdReplaceSemicolon, extractTransformTranslateCoords } from './helpers.js'

const entityKindToShape = {
  Interface: 'rect',
  Default: 'rect',
}

export const arrowTypes = {
  ThickLink: '==>',
  LinkWithArrowHead: '-->',
  Links: '---',
  LinkDotted: '-.->',
} as const

export type ArrowType = (typeof arrowTypes)[keyof typeof arrowTypes]

function getFloatAttrOrThrow(element: Element, name: string) {
  const attr = element.getAttribute(name)
  if (!attr) {
    throw new InternalError(`Expected attribute ${name} to exist on ${element.nodeName}`)
  }
  return parseFloat(attr)
}

export const extractFlowchartNodeCoordinates = (element: Element) => {
  const rect = element.querySelector('rect')

  if (!rect) {
    throw new InternalError(`Expected flowchart node with id ${element.id} to contain a rect`)
  }

  const { x, y } = extractTransformTranslateCoords(element)
  const width = getFloatAttrOrThrow(rect, 'width')
  const height = getFloatAttrOrThrow(rect, 'height')

  return {
    x,
    y,
    width,
    height,
    left: x - 0.5 * width,
    right: x + 0.5 * width,
    top: y - 0.5 * height,
    bottom: y + 0.5 * height,
  } satisfies BoundingBox
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

  createEdgeString(nodeFrom: string, nodeTo: string, edgeType: ArrowType, label?: string): string {
    return `${dtdlIdReplaceSemicolon(nodeFrom)} ${edgeType} ${label ? '|' + label + '|' : ``} ${dtdlIdReplaceSemicolon(nodeTo)}`
  }

  relationshipToMarkdown(dtdlObjectModel: DtdlObjectModel, entity: RelationshipType) {
    // if we don't have both sides of the relationship don't render it
    if (!entity.ChildOf || !entity.target || !(entity.target in dtdlObjectModel)) {
      return []
    }

    const label = getDisplayName(entity)
    return [this.createEdgeString(entity.ChildOf, entity.target, arrowTypes.LinkWithArrowHead, label)]
  }

  interfaceToMarkdown(dtdlObjectModel: DtdlObjectModel, entity: InterfaceType) {
    return [
      this.createNodeString(entity),
      ...entity.extends
        .filter((parent) => !!dtdlObjectModel[parent])
        .map((parent) => this.createEdgeString(parent, entity.Id, arrowTypes.LinkWithArrowHead, 'extends')),
      `class ${dtdlIdReplaceSemicolon(entity.Id)} ${getVisualisationState(entity)}`,
    ]
  }

  generateMarkdown(dtdlObjectModel: DtdlObjectModel, direction: Direction = ' TD'): string | null {
    const graph: string[] = []
    for (const entity in dtdlObjectModel) {
      const entityObject: EntityType = dtdlObjectModel[entity]
      const markdown = (this.entityKindToMarkdown[entityObject.EntityKind] || defaultMarkdownFn) as NarrowMappingFn<
        (typeof entityObject)['EntityKind']
      >
      graph.push(...markdown(dtdlObjectModel, entityObject))
    }

    if (graph.length === 0) {
      return null
    }
    return `${this.diagramType}${direction}\n${graph.join('\n')}`
  }
}
