import {
  ArrayType,
  BooleanType,
  CommandPayloadType,
  CommandRequestType,
  CommandResponseType,
  CommandType,
  CommandTypeType,
  ComplexSchemaType,
  ComponentType,
  ContentType,
  DateTimeType,
  DateType,
  DoubleType,
  DurationType,
  EntityInfo,
  EntityType,
  EnumType,
  EnumValueType,
  FieldType,
  FloatType,
  IntegerType,
  InterfaceType,
  LatentTypeType,
  LongType,
  MapKeyType,
  MapType,
  MapValueType,
  NamedEntityType,
  NamedLatentTypeType,
  NumericSchemaType,
  ObjectType,
  PrimitiveSchemaType,
  PropertyType,
  RelationshipType,
  SchemaFieldType,
  SchemaType,
  StringType,
  TelemetryType,
  TemporalSchemaType,
  TimeType,
  UnitAttributeType,
  UnitType,
} from '../../../interop/DtdlOm.js'

const isArrayType = (entity: EntityType): entity is ArrayType => {
  return entity.EntityKind === 'Array'
}

const isBooleanType = (entity: EntityType): entity is BooleanType => {
  return entity.EntityKind === 'Boolean'
}

const isCommandType = (entity: EntityType): entity is CommandType => {
  return entity.EntityKind === 'Command'
}

const isCommandPayloadType = (entity: EntityType): entity is CommandPayloadType => {
  return ['CommandPayload', 'CommandRequest', 'CommandResponse'].includes(entity.EntityKind)
}

const isCommandRequestType = (entity: EntityType): entity is CommandRequestType => {
  return entity.EntityKind === 'CommandRequest'
}

const isCommandResponseType = (entity: EntityType): entity is CommandResponseType => {
  return entity.EntityKind === 'CommandResponse'
}

const isCommandTypeType = (entity: EntityType): entity is CommandTypeType => {
  return entity.EntityKind === 'CommandType'
}

const isComplexSchemaType = (entity: EntityType): entity is ComplexSchemaType => {
  return ['Array', 'Enum', 'Map', 'Object'].includes(entity.EntityKind)
}

const isComponentType = (entity: EntityType): entity is ComponentType => {
  return entity.EntityKind === 'Component'
}

const isContentType = (entity: EntityType): entity is ContentType => {
  return ['Command', 'Component', 'Property', 'Relationship', 'Telemetry'].includes(entity.EntityKind)
}

const isDateType = (entity: EntityType): entity is DateType => {
  return entity.EntityKind === 'Date'
}

const isDateTimeType = (entity: EntityType): entity is DateTimeType => {
  return entity.EntityKind === 'DateTime'
}

const isDoubleType = (entity: EntityType): entity is DoubleType => {
  return entity.EntityKind === 'Double'
}

const isDurationType = (entity: EntityType): entity is DurationType => {
  return entity.EntityKind === 'Duration'
}

const isEntityInfo = (entity: EntityType): entity is EntityInfo => {
  return typeof entity.EntityKind === 'string'
}

const isEnumType = (entity: EntityType): entity is EnumType => {
  return entity.EntityKind === 'Enum'
}

const isEnumValueType = (entity: EntityType): entity is EnumValueType => {
  return entity.EntityKind === 'EnumValue'
}

const isFieldType = (entity: EntityType): entity is FieldType => {
  return entity.EntityKind === 'Field'
}

const isFloatType = (entity: EntityType): entity is FloatType => {
  return entity.EntityKind === 'Float'
}

const isIntegerType = (entity: EntityType): entity is IntegerType => {
  return entity.EntityKind === 'Integer'
}

const isInterfaceType = (entity: EntityType): entity is InterfaceType => {
  return entity.EntityKind === 'Interface'
}

const isLatentTypeType = (entity: EntityType): entity is LatentTypeType => {
  return entity.EntityKind === 'LatentType'
}

const isLongType = (entity: EntityType): entity is LongType => {
  return entity.EntityKind === 'Long'
}

const isMapType = (entity: EntityType): entity is MapType => {
  return entity.EntityKind === 'Map'
}

const isMapKeyType = (entity: EntityType): entity is MapKeyType => {
  return entity.EntityKind === 'MapKey'
}

const isMapValueType = (entity: EntityType): entity is MapValueType => {
  return entity.EntityKind === 'MapValue'
}

const isNamedEntityType = (entity: EntityType): entity is NamedEntityType => {
  return typeof entity.EntityKind === 'string' // Generic check for named entities
}

const isNamedLatentTypeType = (entity: EntityType): entity is NamedLatentTypeType => {
  return entity.EntityKind === 'NamedLatentType'
}

const isNumericSchemaType = (entity: EntityType): entity is NumericSchemaType => {
  return ['Double', 'Float', 'Integer', 'Long'].includes(entity.EntityKind)
}

const isObjectType = (entity: EntityType): entity is ObjectType => {
  return entity.EntityKind === 'Object'
}

const isPrimitiveSchemaType = (entity: EntityType): entity is PrimitiveSchemaType => {
  return ['Boolean', 'Date', 'DateTime', 'Double', 'Duration', 'Float', 'Integer', 'Long', 'String', 'Time'].includes(
    entity.EntityKind
  )
}

const isPropertyType = (entity: EntityType): entity is PropertyType => {
  return entity.EntityKind === 'Property'
}

const isRelationshipType = (entity: EntityType): entity is RelationshipType => {
  return entity.EntityKind === 'Relationship'
}

const isSchemaType = (entity: EntityType): entity is SchemaType => {
  return [
    'Array',
    'Boolean',
    'Date',
    'DateTime',
    'Double',
    'Duration',
    'Enum',
    'Float',
    'Integer',
    'Long',
    'Map',
    'Object',
    'String',
    'Time',
  ].includes(entity.EntityKind)
}

const isSchemaFieldType = (entity: EntityType): entity is SchemaFieldType => {
  return ['CommandPayload', 'Field', 'MapValue', 'CommandRequest', 'CommandResponse'].includes(entity.EntityKind)
}

const isStringType = (entity: EntityType): entity is StringType => {
  return entity.EntityKind === 'String'
}

const isTelemetryType = (entity: EntityType): entity is TelemetryType => {
  return entity.EntityKind === 'Telemetry'
}

const isTemporalSchemaType = (entity: EntityType): entity is TemporalSchemaType => {
  return ['Date', 'DateTime', 'Duration', 'Time'].includes(entity.EntityKind)
}

const isTimeType = (entity: EntityType): entity is TimeType => {
  return entity.EntityKind === 'Time'
}

const isUnitType = (entity: EntityType): entity is UnitType => {
  return entity.EntityKind === 'Unit'
}

const isUnitAttributeType = (entity: EntityType): entity is UnitAttributeType => {
  return entity.EntityKind === 'UnitAttribute'
}
