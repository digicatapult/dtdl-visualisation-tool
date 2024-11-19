import { DtdlObjectModel, EntityType, RelationshipType } from '@digicatapult/dtdl-parser'

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
  expanded: string[]
): DtdlModelWithMetadata => {
  const entityPairs = Object.entries(dtdlObjectModel)

  const matchingIds = new Set(entityPairs.filter(interfaceFilter(name)).map(([, { Id }]) => Id))

  if (matchingIds.size === 0 || !expanded.every((id) => id in dtdlObjectModel)) {
    return {}
  }

  const allExpandedIds = new Set([...matchingIds, ...expanded])

  const matchingRelationships = new Set(
    entityPairs.filter(relationshipFilter(dtdlObjectModel, allExpandedIds)).flatMap(([, entity]) => {
      const relationship = entity as RelationshipType
      return [relationship.Id, relationship.ChildOf, relationship.target].filter((x) => x !== undefined)
    })
  )

  const idsAndRelationships = new Set([...allExpandedIds, ...matchingRelationships])

  return [...idsAndRelationships].reduce((acc, id) => {
    const entity = dtdlObjectModel[id]
    if (entity.EntityKind === 'Interface')
      setVisualisationState(entity, determineVisualisationState(id, matchingIds, expanded))
    acc[id] = entity
    return acc
  }, {} as DtdlObjectModel)
}

export const getRelatedIdsById = (
  dtdlObjectModel: DtdlObjectModel,
  id: string
): Set<string> => {
  const entityPairs = Object.entries(dtdlObjectModel)
  const matchingIds = new Set([id])
  const relatedIds = new Set(
    entityPairs.filter(relationshipFilter(dtdlObjectModel, matchingIds)).flatMap(([, entity]) => {
      const relationship = entity as RelationshipType
      return [relationship.target].filter((x) => x !== undefined)
    })
  )
  return relatedIds
}
