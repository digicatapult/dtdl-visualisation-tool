import { DtdlObjectModel, EntityType, RelationshipType } from '@digicatapult/dtdl-parser'

import { getDisplayName } from './extract.js'

export type DtdlModelWithMetadata = {
  model: DtdlObjectModel
  metadata: {
    expanded: string[]
    searchResults?: string[]
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

export const filterModelByDisplayName = (
  dtdlModelWithMetadata: DtdlModelWithMetadata,
  name: string
): DtdlModelWithMetadata => {
  const { metadata, model } = dtdlModelWithMetadata
  const entityPairs = Object.entries(model)

  const matchingIds = new Set(entityPairs.filter(interfaceFilter(name)).map(([, { Id }]) => Id))

  if (matchingIds.size === 0 || !metadata.expanded.every((id) => id in model)) {
    return { metadata, model: {} }
  }

  const allExpandedIds = new Set([...matchingIds, ...metadata.expanded])

  const matchingRelationships = new Set(
    entityPairs.filter(relationshipFilter(model, allExpandedIds)).flatMap(([, entity]) => {
      const relationship = entity as RelationshipType
      return [relationship.Id, relationship.ChildOf, relationship.target].filter((x) => x !== undefined)
    })
  )

  const idsAndRelationships = new Set([...allExpandedIds, ...matchingRelationships])

  const filteredModel = [...idsAndRelationships].reduce((acc, id) => {
    acc[id] = model[id]
    return acc
  }, {} as DtdlObjectModel)
  return { metadata: { ...metadata, searchResults: [...matchingIds] }, model: filteredModel }
}
