import { EntityType, InterfaceInfo, RelationshipInfo } from '@digicatapult/dtdl-parser'

export const getDisplayName = (entity: EntityType): string =>
  entity?.displayName?.en ?? entity?.Id ?? 'Entity not found in model'

export const isInterface = (entity: EntityType): entity is InterfaceInfo => entity.EntityKind === 'Interface'
export const isRelationship = (entity: EntityType): entity is RelationshipInfo => entity.EntityKind === 'Relationship'

export const allInterfaceFilter = () => {
  return ([, entity]: [unknown, EntityType]) => entity.EntityKind === 'Interface'
}
