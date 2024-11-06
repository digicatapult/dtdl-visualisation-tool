import { DtdlId, MermaidId } from '../../models/strings'
import { DtdlModelWithMetadata } from '../dtdl/filter'
export const defaultMarkdownFn = (): string[] => []

/*
    IDs have format `dtmi:<domain>:<unique-model-identifier>;<model-version-number>`
    Mermaid IDs can't contain semicolons, so replace final semicolon with a colon.
  */
export const dtdlIdReplaceSemicolon = (idWithSemicolon: DtdlId): MermaidId => {
  return idWithSemicolon.replace(/;(?=\d+$)/, ':') // replace final ; with :
}

export const dtdlIdReinstateSemicolon = (idWithColon: MermaidId): DtdlId => {
  return idWithColon.replace(/:(?=\d+$)/, ';') // replace final : with ;
}

export const getOutlineClass = (dtdlModelWithMetadata: DtdlModelWithMetadata, entityId: DtdlId): string => {
  const { metadata } = dtdlModelWithMetadata

  if (!metadata.searchResults || metadata.searchResults?.includes(entityId)) {
    return `searchResult`
  }
  if (metadata.expanded?.includes(entityId)) {
    return `expanded`
  }
  return `unexpanded`
}
