export const DTDL_VALID_SCHEMAS = [
  'boolean',
  'byte',
  'bytes',
  'date',
  'dateTime',
  'decimal',
  'double',
  'duration',
  'float',
  'integer',
  'long',
  'short',
  'string',
  'time',
  'unsignedByte',
  'unsignedInteger',
  'unsignedLong',
  'unsignedShort',
  'uuid',
] as const

export type DtdlSchema = (typeof DTDL_VALID_SCHEMAS)[number]
