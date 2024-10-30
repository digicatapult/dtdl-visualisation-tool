import { DtdlObjectModel, EntityType, InterfaceType, PropertyType, RelationshipType } from "@digicatapult/dtdl-parser";
import { DtdlId, MermaidId } from "../../models/strings";
import { defaultMarkdownFn, dtdlIdReinstateSemicolon, dtdlIdReplaceSemicolon } from "./helpers";
import { EntityTypeToMarkdownFn, IDiagram, NarrowMappingFn, Direction } from "./diagramInterface";
import { getDisplayName } from "../dtdl/extract";
import { DiagramType } from "../../models/mermaidDiagrams";

enum ArrowType {
    Inheritance = '<|--',
    Composition = '*--',
    Aggregation = 'o--',
    Association = '-->',
    LinkSolid = '--',
    Dependency = '..>',
    Realization = '..|>',
    LinkDashed = '..',
}


export default class ClassDiagram implements IDiagram {
    diagramType: DiagramType = 'classDiagram'
    entityKindToMarkdown: Partial<EntityTypeToMarkdownFn> = {
        Interface: (_, entity) => this.interfaceToMarkdown(entity),
        Relationship: (dtdlObjectModel, entity) => this.relationshipToMarkdown(dtdlObjectModel, entity),
        Property: (_, entity) => this.propertyToMarkdown(entity),
    }

    constructor() { }

    safeClassName = (className: DtdlId): string => `\`${dtdlIdReplaceSemicolon(className)}\``

    generateMarkdown(dtdlObjectModel: DtdlObjectModel, highlightNodeId?: MermaidId, direction: Direction = ' TD'): string | null {
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
            graph.push(this.createEdgeString(entity.ChildOf, entity.target, ArrowType.LinkSolid, entity.name))
        }
        return graph
    }
    interfaceToMarkdown(entity: InterfaceType): string[] {
        const graph: string[] = []
        graph.push(this.createNodeString(entity))
        console.log(graph)
        entity.extends.map((parent) => {
            graph.push(this.createEdgeString(parent, entity.Id, ArrowType.Inheritance))
        })
        return graph
    }
    propertyToMarkdown(entity: PropertyType): string[] {
        const graph: string[] = []
        if (entity.ChildOf) {
            graph.push(`${this.safeClassName(entity.ChildOf)} : ${entity.name}`)
        }
        return graph
    }
}
