import { EntityType, InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { DtdlId, MermaidId } from '../../models/strings.js'
import { getDisplayName } from '../dtdl/extract.js'
import { DtdlModelWithMetadata } from '../dtdl/filter.js'
import { Direction, EntityTypeToMarkdownFn, IDiagram, NarrowMappingFn } from './diagramInterface.js'
import { defaultMarkdownFn, dtdlIdReinstateSemicolon, dtdlIdReplaceSemicolon, getOutlineClass } from './helpers.js'

export enum ArrowType {
  Inheritance = '<|--',
  Composition = '*--',
  Aggregation = 'o--',
  Association = '-->',
  LinkSolid = '--',
  Dependency = '..>',
  Realization = '..|>',
  LinkDashed = '..',
}

export default class ClassDiagram implements IDiagram<'classDiagram'> {
  get diagramType(): 'classDiagram' {
    return 'classDiagram'
  }
  entityKindToMarkdown: Partial<EntityTypeToMarkdownFn> = {
    Interface: (dtdlModelWithMetadata, entity) => this.interfaceToMarkdown(dtdlModelWithMetadata, entity),
    Relationship: (dtdlModelWithMetadata, entity) => this.relationshipToMarkdown(dtdlModelWithMetadata, entity),
  }

  constructor() {}

  safeClassName = (className: string): string => `\`${dtdlIdReplaceSemicolon(className)}\``

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
  relationshipToMarkdown(dtdlModelWithMetadata: DtdlModelWithMetadata, entity: RelationshipType): string[] {
    const graph: string[] = []
    if (entity.ChildOf && entity.target && entity.target in dtdlModelWithMetadata.model) {
      graph.push(this.createEdgeString(entity.ChildOf, entity.target, ArrowType.Association, entity.name))
    }
    return graph
  }
  interfaceToMarkdown(dtdlModelWithMetadata: DtdlModelWithMetadata, entity: InterfaceType): string[] {
    const graph: string[] = []
    graph.push(this.createNodeString(entity))
    entity.extends.map((parent) => {
      graph.push(this.createEdgeString(entity.Id, parent, ArrowType.Inheritance))
    })
    const properties = Object.entries(entity.properties)
    properties.flatMap(([name]) => {
      graph.push(`${this.safeClassName(entity.Id)} : ${name}`)
    })

    graph.push(`class ${this.safeClassName(entity.Id)}:::${getOutlineClass(dtdlModelWithMetadata, entity.Id)}`)

    return graph
  }
}
