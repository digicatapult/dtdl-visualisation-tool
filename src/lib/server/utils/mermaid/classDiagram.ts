import { DtdlObjectModel, EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { DtdlId, MermaidId } from '../../models/strings.js'
import { getDisplayName } from '../dtdl/extract.js'
import { getVisualisationState } from '../dtdl/filter.js'
import { Direction, EntityTypeToMarkdownFn, IDiagram, NarrowMappingFn } from './diagramInterface.js'
import { defaultMarkdownFn, dtdlIdReinstateSemicolon, dtdlIdReplaceSemicolon } from './helpers.js'

export const arrowTypes = {
  Inheritance: '<|--',
  Composition: '*--',
  Aggregation: 'o--',
  Association: '-->',
  LinkSolid: '--',
  Dependency: '..>',
  Realization: '..|>',
  LinkDashed: '..',
}

export type ArrowType = (typeof arrowTypes)[keyof typeof arrowTypes]

const extractCoordinatesFromTranslateString = (translate: string | null | undefined): { x: number; y: number } | null => {
  if (!translate) return null
  const match = translate.match(/translate\(\s*([-\d.]+)[ ,\s]*([-\d.]+)\s*\)/)
  return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null
}

export const extractClassNodeCoordinate = (element: Element): { x: number; y: number } => {
  const labelGroup = element.querySelector('.label-group.text')
  const membersGroup = element.querySelector('.members-group.text')

  const labelCoordinate = extractCoordinatesFromTranslateString(labelGroup?.getAttribute('transform'))
  const membersCoordinate = extractCoordinatesFromTranslateString(membersGroup?.getAttribute('transform'))

  if (labelCoordinate && membersCoordinate) {
    return {
      x: membersCoordinate.x * -1,
      y: labelCoordinate.y,
    }
  }

  return { x: 0, y: 0 }
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
      graph.push(`\nclass ${this.safeClassName(highlightNodeId)}:::highlighted`)
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
    edge += label ? ` : ${label}` : ''
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
