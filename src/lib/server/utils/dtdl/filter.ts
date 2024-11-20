import { DtdlObjectModel, EntityType, RelationshipType } from '@digicatapult/dtdl-parser'

import { InvalidQueryError } from '../../errors.js'
import { DtdlId } from '../../models/strings.js'
import { getDisplayName } from './extract.js'

export const stateSymbol = Symbol('visualisationState')
type VisualisationState = 'unexpanded' | 'expanded' | 'search'

export type DtdlModelWithMetadata = {
  [key in string]: EntityType & { [stateSymbol]?: VisualisationState }
}

export const getVisualisationState = (entity: EntityType): string => {
  return entity?.[stateSymbol]
}

export const setVisualisationState = (entity: EntityType, value: string) => {
  entity[stateSymbol] = value
}

const determineVisualisationState = (
  entityId: DtdlId,
  searchIds: Set<DtdlId>,
  expandedIds: DtdlId[]
): VisualisationState => {
  if (searchIds.size === 0 || searchIds.has(entityId)) {
    return `search`
  }
  if (expandedIds.includes(entityId)) {
    return `expanded`
  }
  return `unexpanded`
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
  dtdlObjectModel: DtdlObjectModel,
  name: string,
  expandedIds: string[]
): DtdlModelWithMetadata => {
  // make sure all expanded Ids are valid
  for (const expandedId of expandedIds) {
    if (!(expandedId in dtdlObjectModel)) {
      throw new InvalidQueryError(`Invalid "expandedId" ${expandedId}`)
    }
  }

  const entityPairs = Object.entries(dtdlObjectModel)

  const searchedIds = new Set(entityPairs.filter(interfaceFilter(name)).map(([, { Id }]) => Id))

  // if the search matches no nodes and no expanded nodes are valid we have an empty set
  if (searchedIds.size === 0 && expandedIds.length === 0) {
    return {}
  }

  const matchingIds = new Set([...searchedIds, ...expandedIds])

  // for all search matches include nodes that extend them. Note this only works one way
  const matchingExtends = [...matchingIds].flatMap((id) => {
    const entity = dtdlObjectModel[id]
    if (entity.EntityKind !== 'Interface' || !('extendedBy' in entity)) {
      return []
    }
    return entity.extendedBy
  })

  // get all relationships of search matches
  const matchingRelationships = new Set(
    entityPairs.filter(relationshipFilter(dtdlObjectModel, matchingIds)).flatMap(([, entity]) => {
      const relationship = entity as RelationshipType
      return [relationship.Id, relationship.ChildOf, relationship.target].filter((x) => x !== undefined)
    })
  )

  const idsAndRelationships = new Set([...matchingIds, ...matchingExtends, ...matchingRelationships])

  return [...idsAndRelationships].reduce((acc, id) => {
    const entity = dtdlObjectModel[id]
    if (entity.EntityKind === 'Interface')
      setVisualisationState(entity, determineVisualisationState(id, searchedIds, expandedIds))
    acc[id] = entity
    return acc
  }, {} as DtdlObjectModel)
}

export const getRelatedIdsById = (dtdlObjectModel: DtdlObjectModel, id: string): Set<string> => {
  const entityPairs = Object.entries(dtdlObjectModel)
  const matchingIds = new Set([id])
  const matchingEntity = dtdlObjectModel[id]
  if (matchingEntity.EntityKind !== 'Interface' || !('extendedBy' in matchingEntity)) {
    return new Set()
  }
  const relatedIds = new Set([
    ...entityPairs.filter(relationshipFilter(dtdlObjectModel, matchingIds)).flatMap(([, entity]) => {
      const relationship = entity as RelationshipType
      return [relationship.ChildOf, relationship.target].filter((x) => x !== undefined)
    }),
    ...matchingEntity.extendedBy,
    ...matchingEntity.extends
  ])
  return relatedIds
}
