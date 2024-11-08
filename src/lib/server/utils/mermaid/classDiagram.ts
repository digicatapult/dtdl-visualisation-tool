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

export default class ClassDiagram implements IDiagram<'classDiagram'> {
  get diagramType(): 'classDiagram' {
    return 'classDiagram'
  }
  entityKindToMarkdown: Partial<EntityTypeToMarkdownFn> = {
    Interface: (_, entity) => this.interfaceToMarkdown(entity),
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
  interfaceToMarkdown(entity: InterfaceType): string[] {
    const graph: string[] = []
    graph.push(this.createNodeString(entity))
    entity.extends.map((parent) => {
      graph.push(this.createEdgeString(entity.Id, parent, arrowTypes.Inheritance))
    })
    const properties = Object.entries(entity.properties)
    properties.flatMap(([name]) => {
      graph.push(`${this.safeClassName(entity.Id)} : ${name}`)
    })

    graph.push(`class ${this.safeClassName(entity.Id)}:::${getVisualisationState(entity)}`)

    return graph
  }
}
