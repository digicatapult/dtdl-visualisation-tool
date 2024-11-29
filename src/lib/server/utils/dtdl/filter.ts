import { DtdlObjectModel, EntityType, RelationshipType } from '@digicatapult/dtdl-parser'

import { InvalidQueryError } from '../../errors.js'
import { DtdlId } from '../../models/strings.js'
import { ISearch } from '../search.js'

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

export const searchInterfacesAndRelationships = (search: ISearch<EntityType>, searchQuery: string): {
  matchedInterfaces: Set<string>,
  matchedRelationships: Set<{ childOf: string, target: string, relationship: string }>
} => {
  const quotedStringRegex = /(['"])(.*?)\1/g // capture groups inside "" or ''
  const quotedTerms = Array.from(searchQuery.matchAll(quotedStringRegex)).map((match) => match[2])

  const remainingQuery = searchQuery.replace(quotedStringRegex, '')
  const remainingTerms = remainingQuery.split(' ').filter((term) => term !== '')
  const searchTerms = [...remainingTerms, ...quotedTerms]
  const matchedInterfaces = new Set<string>()
  const matchedRelationships = new Set<{ childOf: string, target: string, relationship: string }>()
  searchTerms.flatMap((term) => search.filter(term).forEach((entity) => {
    entity['matches'].forEach((match) => {
      if (match.key === 'relationships') {
        matchedRelationships.add({ childOf: entity.Id, target: entity['relationships'][match.value], relationship: match.value })
      }
      else {
        matchedInterfaces.add(entity.Id)
      }
    })
    return entity.Id
  }))
  return { matchedInterfaces: matchedInterfaces, matchedRelationships: matchedRelationships }
}

const relationshipIdByName = (name: string, entityPairs: [string, EntityType][]): string | undefined => {
  entityPairs.forEach(([, entity]) => {
    if (entity.EntityKind === 'Relationship') {
      if (name === entity.displayName.en) { entity.Id }
    }
  })
  return undefined
}

export const filterModelByDisplayName = (
  dtdlObjectModel: DtdlObjectModel,
  search: ISearch<EntityType>,
  searchQuery: string,
  expandedIds: string[]
): DtdlModelWithMetadata => {
  // make sure all expanded Ids are valid
  for (const expandedId of expandedIds) {
    if (!(expandedId in dtdlObjectModel)) {
      throw new InvalidQueryError(`Invalid "expandedId" ${expandedId}`)
    }
  }

  const entityPairs = Object.entries(dtdlObjectModel)

  const { matchedInterfaces, matchedRelationships } = searchInterfacesAndRelationships(search, searchQuery)

  // if the search matches no nodes and no expanded nodes are valid we have an empty set
  if (matchedInterfaces.size === 0 && expandedIds.length === 0) {
    return {}
  }

  const matchingIds = new Set([...matchedInterfaces, ...expandedIds])

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

  const interfacesFromSearchedRelationships = new Set(
    [...matchedRelationships].flatMap((relationship) => {
      return [
        relationship.childOf,
        relationship.target,
        relationshipIdByName(relationship.relationship, entityPairs)
      ].filter((x) => x !== undefined)
    })
  )

  // const searchedRelationships = new Set()

  const idsAndRelationships = new Set([...matchingIds, ...matchingExtends, ...matchingRelationships, ...interfacesFromSearchedRelationships])

  return [...idsAndRelationships].reduce((acc, id) => {
    const entity = dtdlObjectModel[id]
    if (entity.EntityKind === 'Interface')
      setVisualisationState(entity, determineVisualisationState(id, matchedInterfaces, expandedIds))
    acc[id] = entity
    return acc
  }, {} as DtdlObjectModel)
}

export const getRelatedIdsById = (dtdlObjectModel: DtdlObjectModel, id: string): Set<string> => {
  const entityPairs = Object.entries(dtdlObjectModel)
  const matchingIds = new Set([id])
  if (!(id in dtdlObjectModel)) {
    return new Set()
  }
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
    ...matchingEntity.extends,
  ])
  relatedIds.delete(id)
  return relatedIds
}
