import { EntityType, InterfaceInfo, PropertyInfo, RelationshipInfo, TelemetryInfo } from '@digicatapult/dtdl-parser'

export const getDisplayNameOrId = (entity: EntityType): string =>
  entity?.displayName?.en ?? entity?.Id ?? 'Entity not found in model'

export const isInterface = (entity: EntityType): entity is InterfaceInfo => entity.EntityKind === 'Interface'
export const isRelationship = (entity: EntityType): entity is RelationshipInfo => entity.EntityKind === 'Relationship'
export const isProperty = (entity: EntityType): entity is PropertyInfo => entity.EntityKind === 'Property'
export const isTelemetry = (entity: EntityType): entity is TelemetryInfo => entity.EntityKind === 'Telemetry'

export const allInterfaceFilter = () => {
  return ([, entity]: [unknown, EntityType]) => entity.EntityKind === 'Interface'
}
