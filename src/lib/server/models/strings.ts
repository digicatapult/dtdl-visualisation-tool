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
