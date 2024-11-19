import { DtdlId, MermaidId } from '../../models/strings'
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

export const setElementAttributes = (element: Element, attributes: object) => {
  Object.keys(attributes).forEach((key) => element.setAttribute(key, attributes[key]))
}
