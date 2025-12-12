import {
  CommandInfo,
  CommandRequestInfo,
  CommandResponseInfo,
  EntityType,
  InterfaceInfo,
  NamedEntityInfo,
  PropertyInfo,
  RelationshipInfo,
  TelemetryInfo,
} from '@digicatapult/dtdl-parser'
import { DTDL_PRIMITIVE_SCHEMAS_SET } from '../../models/strings.js'

export const getDisplayName = (entity: EntityType): string => {
  if (!entity) return 'Entity not found in model'
  return entity?.displayName?.en ?? (isNamedEntity(entity) ? entity?.name : entity?.Id)
}

export const isInterface = (entity: EntityType): entity is InterfaceInfo => entity.EntityKind === 'Interface'
export const isRelationship = (entity: EntityType): entity is RelationshipInfo => entity.EntityKind === 'Relationship'
export const isProperty = (entity: EntityType): entity is PropertyInfo => entity.EntityKind === 'Property'
export const isTelemetry = (entity: EntityType): entity is TelemetryInfo => entity.EntityKind === 'Telemetry'
export const isNamedEntity = (entity: EntityType): entity is NamedEntityInfo => 'name' in entity
export const isCommand = (entity: EntityType): entity is CommandInfo => entity.EntityKind === 'Command'
export const isCommandRequest = (entity: EntityType): entity is CommandRequestInfo =>
  entity.EntityKind === 'CommandRequest'
export const isCommandResponse = (entity: EntityType): entity is CommandResponseInfo =>
  entity.EntityKind === 'CommandResponse'

export const allInterfaceFilter = () => {
  return ([, entity]: [unknown, EntityType]) => entity.EntityKind === 'Interface'
}

export const getSchemaDisplayName = (entity: EntityType) => {
  if (!entity) return 'Entity not found in model'
  if (!DTDL_PRIMITIVE_SCHEMAS_SET.has(entity.EntityKind.toLowerCase())) return 'Complex schema'
  return getDisplayName(entity)
}
