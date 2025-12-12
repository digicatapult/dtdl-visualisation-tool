/**
 * Mermaid ID format.
 * @pattern dtmi:\S*\S:[\d]*
 * @example "dtmi:domain:unique_id:uniqueSubId:1"
 */
export type MermaidId = string

/**
 * Dtdl ID format.
 * @pattern dtmi:\S*\S;[\d]*
 * @example "dtmi:domain:unique_id:uniqueSubId;1"
 */
export type DtdlId = string

/**
 * Stringified UUIDv4.
 * @pattern [0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}
 * @example "52907745-7672-470e-a803-a2f8feb52944"
 */
export type UUID = string

export const DTDL_PRIMITIVE_SCHEMAS = [
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
export const DTDL_PRIMITIVE_SCHEMA_OPTIONS = DTDL_PRIMITIVE_SCHEMAS.map((opt) => ({ value: opt, label: opt }))
export const DTDL_PRIMITIVE_SCHEMAS_SET = new Set(DTDL_PRIMITIVE_SCHEMAS.map((s) => s.toLowerCase()))

export type DtdlSchema = (typeof DTDL_PRIMITIVE_SCHEMAS)[number]

const DTDL_VALID_WRITABLE = [true, false] as const
export const DTDL_VALID_WRITABLE_OPTIONS = DTDL_VALID_WRITABLE.map((opt) => ({
  value: String(opt),
  label: String(opt),
}))
