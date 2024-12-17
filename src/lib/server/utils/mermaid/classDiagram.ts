import { DtdlObjectModel, EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { InternalError } from '../../errors.js'
import { DtdlId } from '../../models/strings.js'
import { getDisplayName } from '../dtdl/extract.js'
import { getVisualisationState } from '../dtdl/filter.js'
import { Direction, EntityTypeToMarkdownFn, IDiagram, NarrowMappingFn } from './diagramInterface.js'
import {
  BoundingBox,
  defaultMarkdownFn,
  dtdlIdReplaceSemicolon,
  extractPathExtents,
  extractTransformTranslateCoords,
} from './helpers.js'

export const arrowTypes = {
  Inheritance: '<|--',
  Composition: '*--',
  Aggregation: 'o--',
  Association: '-->',
  LinkSolid: '--',
  Dependency: '..>',
  Realization: '..|>',
  LinkDashed: '..',
} as const

export type ArrowType = (typeof arrowTypes)[keyof typeof arrowTypes]

export const extractClassNodeCoordinate = (element: Element) => {
  const parentTransform = extractTransformTranslateCoords(element)
  const labelContainerPath = element.querySelector('.label-container > path:first-child')
  if (!labelContainerPath) {
    throw new InternalError('Expected node to contain a path within the label-container')
  }
  const labelExtents = extractPathExtents(labelContainerPath)

  return {
    x: parentTransform.x,
    y: parentTransform.y,
    width: labelExtents.maxX - labelExtents.minX,
    height: labelExtents.maxY - labelExtents.minY,
    left: parentTransform.x + labelExtents.minX,
    right: parentTransform.x + labelExtents.maxX,
    top: parentTransform.y + labelExtents.minY,
    bottom: parentTransform.y + labelExtents.maxY,
  } satisfies BoundingBox
}

export default class ClassDiagram implements IDiagram<'classDiagram'> {
  get diagramType(): 'classDiagram' {
    return 'classDiagram'
  }
  entityKindToMarkdown: Partial<EntityTypeToMarkdownFn> = {
    Interface: (dtdlObjectModel, entity) => this.interfaceToMarkdown(dtdlObjectModel, entity),
    Relationship: (dtdlObjectModel, entity) => this.relationshipToMarkdown(dtdlObjectModel, entity),
  }

  constructor() {}

  safeClassName = (className: string): string => `\`${dtdlIdReplaceSemicolon(className)}\``

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
    return `${this.diagramType}\n direction ${direction}\n${graph.join('\n')}`
  }
  createNodeString(entity: EntityType, withClick: boolean = true): string {
    let entityMarkdown = `class ${this.safeClassName(entity.Id)}["${getDisplayName(entity)}"] `
    entityMarkdown += withClick ? `\nclick ${this.safeClassName(entity.Id)} call getEntity()` : ``
    return entityMarkdown
  }
  createEdgeString(nodeFrom: DtdlId, nodeTo: DtdlId, edgeType: ArrowType, label?: string): string {
    let edge = `${this.safeClassName(nodeFrom)} ${edgeType} ${this.safeClassName(nodeTo)}`
    edge += label ? ` : ${label}` : ' : extends'
    return edge
  }
  relationshipToMarkdown(dtdlObjectModel: DtdlObjectModel, entity: RelationshipType): string[] {
    const graph: string[] = []
    if (entity.ChildOf && entity.target && entity.target in dtdlObjectModel) {
      graph.push(this.createEdgeString(entity.ChildOf, entity.target, arrowTypes.Association, entity.name))
    }
    return graph
  }
  interfaceToMarkdown(dtdlObjectModel: DtdlObjectModel, entity: InterfaceType): string[] {
    const graph: string[] = [
      this.createNodeString(entity),
      ...entity.extends
        .filter((parent) => !!dtdlObjectModel[parent])
        .map((parent) => this.createEdgeString(entity.Id, parent, arrowTypes.Inheritance)),
      ...Object.entries(entity.properties).flatMap(([name]) => `${this.safeClassName(entity.Id)} : ${name}`),
      `class ${this.safeClassName(entity.Id)}:::${getVisualisationState(entity)}`,
    ]

    return graph
  }
}
