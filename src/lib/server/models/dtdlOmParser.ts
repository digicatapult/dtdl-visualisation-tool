import { z } from 'zod'

const nullToUndefined = (v: unknown) => (v === null ? undefined : v)

const localizedTextParser = z.preprocess((v) => {
  const value = nullToUndefined(v)
  if (typeof value === 'string') return { en: value }
  return value
}, z.record(z.string(), z.string()).optional())

const stringRecordParser = z.preprocess((v) => {
  const value = nullToUndefined(v)
  if (Array.isArray(value)) return {}
  return value
}, z.record(z.string(), z.string()).optional())

const stringArrayParser = z.preprocess((v) => {
  const value = nullToUndefined(v)
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value
  return value
}, z.array(z.string()).optional())

const stringArrayFromArrayOrRecordValuesParser = z.preprocess((v) => {
  const value = nullToUndefined(v)
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>)
  return value
}, z.array(z.string()).optional())

const unknownSchema = z.unknown().optional()

const commentParser = z.preprocess(
  (v) => nullToUndefined(v),
  z.union([z.string(), z.record(z.string(), z.string())]).optional()
)

const definedInParser = z.preprocess((v) => nullToUndefined(v), z.string().optional())

const commonEntityFields = {
  ClassId: z.string().default(''),
  displayName: localizedTextParser,
  description: localizedTextParser,
  comment: commentParser,
  SupplementalTypes: stringArrayParser.transform((v) => v ?? []),
  SupplementalProperties: stringRecordParser.transform((v) => v ?? {}),
  UndefinedTypes: stringArrayParser.transform((v) => v ?? []),
  UndefinedProperties: stringRecordParser.transform((v) => v ?? {}),
  DefinedIn: definedInParser,
} as const

const interfaceParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Interface'),
    extends: stringArrayParser.transform((v) => v ?? []),
    extendedBy: stringArrayParser.transform((v) => v ?? []),
    contents: stringArrayFromArrayOrRecordValuesParser.transform((v) => v ?? []),
    schemas: stringArrayParser.transform((v) => v ?? []),
    properties: stringRecordParser.transform((v) => v ?? {}),
    relationships: stringRecordParser.transform((v) => v ?? {}),
    telemetries: stringRecordParser.transform((v) => v ?? {}),
    commands: stringRecordParser.transform((v) => v ?? {}),
    components: stringRecordParser.transform((v) => v ?? {}),
  })
  .passthrough()

const relationshipParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Relationship'),
    ChildOf: z.preprocess((v) => nullToUndefined(v), z.string().optional()),
    target: z.preprocess((v) => nullToUndefined(v), z.string().optional()),
    properties: stringRecordParser.transform((v) => v ?? {}),
    name: z.string().optional(),
    writable: z.boolean().optional(),
  })
  .passthrough()

const propertyParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Property'),
    schema: z.preprocess((v) => nullToUndefined(v), z.string().optional()),
    name: z.string().optional(),
    writable: z.boolean().optional(),
  })
  .passthrough()

const telemetryParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Telemetry'),
    schema: z.preprocess((v) => nullToUndefined(v), z.string().optional()),
    name: z.string().optional(),
  })
  .passthrough()

const commandRequestParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('CommandRequest'),
    schema: z.preprocess((v) => nullToUndefined(v), z.string().optional()),
    name: z.string().optional(),
  })
  .passthrough()

const commandResponseParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('CommandResponse'),
    schema: z.preprocess((v) => nullToUndefined(v), z.string().optional()),
    name: z.string().optional(),
  })
  .passthrough()

const commandParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Command'),
    request: z.preprocess((v) => nullToUndefined(v), z.string().optional()),
    response: z.preprocess((v) => nullToUndefined(v), z.string().optional()),
    name: z.string().optional(),
  })
  .passthrough()

const componentParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Component'),
    schema: z.preprocess((v) => nullToUndefined(v), z.string().optional()),
    name: z.string().optional(),
  })
  .passthrough()

const primitiveSchemaParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.enum([
      'Boolean',
      'Byte',
      'Bytes',
      'Date',
      'DateTime',
      'Decimal',
      'Double',
      'Duration',
      'Float',
      'Integer',
      'Long',
      'Short',
      'String',
      'Time',
      'UnsignedByte',
      'UnsignedInteger',
      'UnsignedLong',
      'UnsignedShort',
      'Uuid',
    ]),
  })
  .passthrough()

const enumParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Enum'),
    enumValues: stringArrayParser.transform((v) => v ?? []),
    valueSchema: unknownSchema,
  })
  .passthrough()

const enumValueParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('EnumValue'),
    enumValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
    name: z.string().optional(),
  })
  .passthrough()

const objectParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Object'),
    fields: stringArrayParser.transform((v) => v ?? []),
  })
  .passthrough()

const fieldParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Field'),
    schema: unknownSchema,
    name: z.string().optional(),
  })
  .passthrough()

const arrayParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Array'),
    elementSchema: unknownSchema,
  })
  .passthrough()

const mapParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Map'),
    mapKey: unknownSchema,
    mapValue: unknownSchema,
  })
  .passthrough()

const unitParser = z
  .object({
    ...commonEntityFields,
    Id: z.string(),
    EntityKind: z.literal('Unit'),
    name: z.string().optional(),
  })
  .passthrough()

export const dtdlEntityParser = z.discriminatedUnion('EntityKind', [
  interfaceParser,
  relationshipParser,
  propertyParser,
  telemetryParser,
  commandParser,
  commandRequestParser,
  commandResponseParser,
  componentParser,
  primitiveSchemaParser,
  enumParser,
  enumValueParser,
  objectParser,
  fieldParser,
  arrayParser,
  mapParser,
  unitParser,
])

export const dtdlObjectModelParser = z.record(z.string(), dtdlEntityParser)

export type DtdlEntity = z.infer<typeof dtdlEntityParser>
export type InterfaceEntity = Extract<DtdlEntity, { EntityKind: 'Interface' }>
export type RelationshipEntity = Extract<DtdlEntity, { EntityKind: 'Relationship' }>
export type PropertyEntity = Extract<DtdlEntity, { EntityKind: 'Property' }>
export type TelemetryEntity = Extract<DtdlEntity, { EntityKind: 'Telemetry' }>
export type CommandEntity = Extract<DtdlEntity, { EntityKind: 'Command' }>
export type CommandRequestEntity = Extract<DtdlEntity, { EntityKind: 'CommandRequest' }>
export type CommandResponseEntity = Extract<DtdlEntity, { EntityKind: 'CommandResponse' }>
export type ComponentEntity = Extract<DtdlEntity, { EntityKind: 'Component' }>
export type EnumEntity = Extract<DtdlEntity, { EntityKind: 'Enum' }>
export type EnumValueEntity = Extract<DtdlEntity, { EntityKind: 'EnumValue' }>
export type ObjectEntity = Extract<DtdlEntity, { EntityKind: 'Object' }>
export type FieldEntity = Extract<DtdlEntity, { EntityKind: 'Field' }>
export type ArrayEntity = Extract<DtdlEntity, { EntityKind: 'Array' }>
export type MapEntity = Extract<DtdlEntity, { EntityKind: 'Map' }>
export type UnitEntity = Extract<DtdlEntity, { EntityKind: 'Unit' }>
export type DtdlModel = z.infer<typeof dtdlObjectModelParser>
