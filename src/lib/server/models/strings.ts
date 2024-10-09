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
