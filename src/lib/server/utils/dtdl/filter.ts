import { InvalidQueryError } from '../../errors.js'
import { DtdlEntity, DtdlModel } from '../../models/dtdlOmParser.js'
import { DtdlId } from '../../models/strings.js'
import { ISearch } from '../search.js'
import { isInterface, isRelationship } from './extract.js'

export const stateSymbol = Symbol('visualisationState')
type VisualisationState = 'unexpanded' | 'expanded' | 'search'

export type DtdlEntityWithMetadata = DtdlEntity & { [stateSymbol]?: VisualisationState }
export type DtdlModelWithMetadata = Record<string, DtdlEntityWithMetadata>

export const getVisualisationState = (entity: DtdlEntityWithMetadata): VisualisationState | undefined => {
  return entity[stateSymbol]
}

export const setVisualisationState = (entity: DtdlEntityWithMetadata, value: VisualisationState) => {
  entity[stateSymbol] = value
}

const idsFromRecordOrArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).filter((v): v is string => typeof v === 'string')
  }

  return []
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
  (dtdlObjectModel: DtdlModel, matchingIds: Set<string>) =>
  ([, entity]: [id: unknown, entity: DtdlEntity]) => {
    if (!isRelationship(entity)) {
      return false
    }
    const relationship = entity

    if (!relationship.target || !(relationship.target in dtdlObjectModel)) {
      return false
    }

    if (matchingIds.has(relationship.Id)) {
      return true
    }

    if (relationship.ChildOf && matchingIds.has(relationship.ChildOf)) {
      return true
    }

    if (relationship.target && matchingIds.has(relationship.target)) {
      return true
    }

    return false
  }

export const searchInterfaces = (search: ISearch<DtdlEntity>, searchQuery: string): Set<string> => {
  const quotedStringRegex = /(['"])(.*?)\1/g // capture groups inside "" or ''
  const quotedTerms = Array.from(searchQuery.matchAll(quotedStringRegex)).map((match) => match[2])

  const remainingQuery = searchQuery.replace(quotedStringRegex, '')
  const remainingTerms = remainingQuery.split(' ').filter((term) => term !== '')
  const searchTerms = [...remainingTerms, ...quotedTerms]
  const matches = searchTerms.flatMap((term) => search.filter(term).map(({ Id }) => Id))
  return new Set(matches)
}

export const filterModelByDisplayName = (
  dtdlObjectModel: DtdlModel,
  search: ISearch<DtdlEntity>,
  searchQuery: string,
  expandedIds: string[]
): DtdlModelWithMetadata => {
  // make sure all expanded Ids are valid
  for (const expandedId of expandedIds) {
    if (!(expandedId in dtdlObjectModel)) {
      throw new InvalidQueryError(
        'Request Error',
        `Invalid parameter "expandedId" (${expandedId}). Please reset view or reload model.`,
        'Invalid parameter "expandedId" (${expandedId})',
        true
      )
    }
  }

  const entityPairs = Object.entries(dtdlObjectModel)

  const searchedIds = searchInterfaces(search, searchQuery)

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
      if (!isRelationship(entity)) {
        return []
      }
      return [entity.Id, entity.ChildOf, entity.target].filter((x) => x !== undefined)
    })
  )

  // for each expandedId include the node that it extends
  const expandedExtends = [...expandedIds].flatMap((id) => {
    const entity = dtdlObjectModel[id]
    if (entity.EntityKind !== 'Interface' || !('extends' in entity)) {
      return []
    }
    return entity.extends
  })

  const idsAndRelationships = new Set([
    ...matchingIds,
    ...matchingExtends,
    ...matchingRelationships,
    ...expandedExtends,
  ])

  // get contents of all
  const contentsIds = [...idsAndRelationships].flatMap((id) => {
    const entity = dtdlObjectModel[id]
    if (!entity || !isInterface(entity)) {
      return []
    }

    return [
      ...idsFromRecordOrArray((entity as Record<string, unknown>).properties),
      ...idsFromRecordOrArray((entity as Record<string, unknown>).telemetries),
    ]
  })

  const idsAndRelationshipsAndContents = new Set([...idsAndRelationships, ...contentsIds])

  return [...idsAndRelationshipsAndContents].reduce((acc, id) => {
    const entity = dtdlObjectModel[id]
    if (!entity) {
      return acc
    }
    const entityWithMetadata = entity as DtdlEntityWithMetadata
    if (isInterface(entityWithMetadata)) {
      setVisualisationState(entityWithMetadata, determineVisualisationState(id, searchedIds, expandedIds))
    }
    acc[id] = entityWithMetadata
    return acc
  }, {} as DtdlModelWithMetadata)
}

export const getRelatedIdsById = (dtdlObjectModel: DtdlModel, id: string): Set<string> => {
  const entityPairs = Object.entries(dtdlObjectModel)
  const matchingIds = new Set([id])
  if (!(id in dtdlObjectModel)) {
    return new Set()
  }
  const matchingEntity = dtdlObjectModel[id]
  if (!matchingEntity || !isInterface(matchingEntity)) {
    return new Set()
  }
  const relatedIds = new Set([
    ...entityPairs.filter(relationshipFilter(dtdlObjectModel, matchingIds)).flatMap(([, entity]) => {
      if (!isRelationship(entity)) {
        return []
      }
      return [entity.ChildOf, entity.target].filter((x) => x !== undefined)
    }),
    ...matchingEntity.extendedBy,
    ...matchingEntity.extends,
  ])
  relatedIds.delete(id)
  return relatedIds
}
