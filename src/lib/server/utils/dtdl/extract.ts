import {
  CommandEntity,
  CommandRequestEntity,
  CommandResponseEntity,
  DtdlEntity,
  InterfaceEntity,
  PropertyEntity,
  RelationshipEntity,
  TelemetryEntity,
} from '../../models/dtdlOmParser.js'
import { DTDL_PRIMITIVE_SCHEMAS_SET } from '../../models/strings.js'

export const getDisplayName = (entity: DtdlEntity | undefined): string => {
  if (!entity) return 'Entity not found in model'
  return entity?.displayName?.en ?? (isNamedEntity(entity) ? entity?.name : entity?.Id)
}

export const getCommentText = (comment: string | Record<string, string> | undefined): string => {
  if (!comment) return ''
  if (typeof comment === 'string') return comment
  if (typeof comment.en === 'string') return comment.en
  const first = Object.values(comment).find((value) => typeof value === 'string')
  return typeof first === 'string' ? first : ''
}

export const isInterface = (entity: DtdlEntity): entity is InterfaceEntity => entity.EntityKind === 'Interface'
export const isRelationship = (entity: DtdlEntity): entity is RelationshipEntity => entity.EntityKind === 'Relationship'
export const isProperty = (entity: DtdlEntity): entity is PropertyEntity => entity.EntityKind === 'Property'
export const isTelemetry = (entity: DtdlEntity): entity is TelemetryEntity => entity.EntityKind === 'Telemetry'
export const isNamedEntity = (entity: DtdlEntity): entity is DtdlEntity & { name: string } => 'name' in entity
export const isCommand = (entity: DtdlEntity): entity is CommandEntity => entity.EntityKind === 'Command'
export const isCommandRequest = (entity: DtdlEntity): entity is CommandRequestEntity =>
  entity.EntityKind === 'CommandRequest'
export const isCommandResponse = (entity: DtdlEntity): entity is CommandResponseEntity =>
  entity.EntityKind === 'CommandResponse'

export const allInterfaceFilter = () => {
  return ([, entity]: [unknown, DtdlEntity]) => entity.EntityKind === 'Interface'
}

export const getSchemaDisplayName = (entity: DtdlEntity | undefined) => {
  if (!entity) return 'Entity not found in model'
  if (!DTDL_PRIMITIVE_SCHEMAS_SET.has(entity.EntityKind.toLowerCase())) return 'Complex schema'
  return getDisplayName(entity)
}
