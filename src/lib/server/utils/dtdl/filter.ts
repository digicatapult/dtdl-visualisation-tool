import { DtdlObjectModel, EntityType, RelationshipType } from '@digicatapult/dtdl-parser'

import { getDisplayName } from './extract.js'

export type DtdlModelWithMetadata = {
  model: DtdlObjectModel
  metadata: {
    expanded: string[]
  }
}

const interfaceFilter = (name: string) => {
  const nameLower = name.toLowerCase()
  return ([, entity]: [unknown, EntityType]) =>
    entity.EntityKind === 'Interface' && getDisplayName(entity).toLowerCase().includes(nameLower)
}

const relationshipFilter =
  (dtdlObjectModel: DtdlObjectModel, matchingIds: Set<string>) =>
  ([, entity]: [id: unknown, entity: EntityType]) => {
    if (entity.EntityKind !== 'Relationship') {
      return false
    }
    const relationship = entity as RelationshipType

    if (!relationship.target || !(relationship.target in dtdlObjectModel)) {
      return false
    }

    if (relationship.ChildOf && matchingIds.has(relationship.ChildOf)) {
      return true
    }

    if (relationship.target && matchingIds.has(relationship.target)) {
      return true
    }

    return false
  }

const getRelationshipIds = (entityPairs: [string, EntityType][], model: DtdlObjectModel, matchingIds: Set<string>) => {
  return new Set(
    entityPairs.filter(relationshipFilter(model, matchingIds)).flatMap(([, entity]) => {
      const relationship = entity as RelationshipType
      return [relationship.Id, relationship.ChildOf, relationship.target].filter((x) => x !== undefined)
    })
  )
}

export const filterModelByDisplayName = (
  dtdlObjectModel: DtdlModelWithMetadata,
  name: string
): DtdlModelWithMetadata => {
  const { metadata, model } = dtdlObjectModel
  const entityPairs = Object.entries(model)

  const matchingIds = new Set(entityPairs.filter(interfaceFilter(name)).map(([, { Id }]) => Id))

  if (matchingIds.size === 0 || !metadata.expanded.every((id) => id in model)) {
    return { metadata, model: {} }
  }

  const expandedIds = new Set([...matchingIds, ...metadata.expanded])
  console.log(expandedIds)

  const expandedRelationships = getRelationshipIds(entityPairs, model, expandedIds)

  const idsAndRelationships = new Set([...expandedIds, ...expandedRelationships])

  const filteredModel = [...idsAndRelationships].reduce((acc, id) => {
    acc[id] = model[id]
    return acc
  }, {} as DtdlObjectModel)
  return { metadata: { expanded: [...expandedIds] }, model: filteredModel }
}
