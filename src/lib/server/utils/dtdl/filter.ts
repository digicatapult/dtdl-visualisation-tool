import { DtdlObjectModel, EntityType, PropertyType, RelationshipType } from '@digicatapult/dtdl-parser'

import { getDisplayName } from './extract.js'

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

const propertiesFilter =
  (dtdlObjectModel: DtdlObjectModel, matchingIds: Set<string>) =>
  ([, entity]: [id: unknown, entity: EntityType]) => {
    if (entity.EntityKind !== 'Property') {
      return false
    }
    const property = entity as RelationshipType

    if (!property.ChildOf || !(property.ChildOf in dtdlObjectModel)) {
      return false
    }

    if (matchingIds.has(property.ChildOf)) {
      return true
    }

    return false
  }

export const filterModelByDisplayName = (dtdlObjectModel: DtdlObjectModel, name: string): DtdlObjectModel => {
  const entityPairs = Object.entries(dtdlObjectModel)

  const matchingIds = new Set(entityPairs.filter(interfaceFilter(name)).map(([, { Id }]) => Id))

  if (matchingIds.size === 0) {
    return {}
  }

  const matchingRelationships = new Set(
    entityPairs.filter(relationshipFilter(dtdlObjectModel, matchingIds)).flatMap(([, entity]) => {
      const relationship = entity as RelationshipType
      return [relationship.Id, relationship.ChildOf, relationship.target].filter((x) => x !== undefined)
    })
  )

  const matchingProperties = new Set(
    entityPairs.filter(propertiesFilter(dtdlObjectModel, matchingIds)).flatMap(([, entity]) => {
      const property = entity as PropertyType
      return [property.Id, property.ChildOf].filter((x) => x !== undefined)
    })
  )

  const idsAndRelationships = new Set([...matchingIds, ...matchingRelationships, ...matchingProperties])

  return [...idsAndRelationships].reduce((acc, id) => {
    acc[id] = dtdlObjectModel[id]
    return acc
  }, {} as DtdlObjectModel)
}
