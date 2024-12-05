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

const translateRegex = /translate\(\s*([-\d.]+)[ ,\s]*([-\d.]+)\s*\)/
export function extractTransformTranslateCoords(element: Element) {
  const transform = element.getAttribute('transform')
  const result = transform && transform.match(translateRegex)
  if (!result) {
    throw new Error(`Expected translate in transform attribute on element ${element.id}`)
  }
  return {
    x: parseFloat(result[1]),
    y: parseFloat(result[2]),
  }
}

const pathRegex = /[ML](?:([\-]{0,1}\d+[\.]{0,1}\d+)\s+([\-]{0,1}\d+[\.]{0,1}\d+))/g
export function extractPathExtents(element: Element) {
  const dAttr = element.getAttribute('d')
  const pairs = dAttr && Array.from(dAttr.matchAll(pathRegex))
  if (!pairs || !pairs.length) {
    throw new Error(`Expected lengths in d attribute on path element ${element.id}`)
  }
  return pairs.reduce(
    ({ minX, minY, maxX, maxY }, match) => {
      return {
        minX: Math.min(minX, parseFloat(match[1])),
        maxX: Math.max(maxX, parseFloat(match[1])),
        minY: Math.min(minY, parseFloat(match[2])),
        maxY: Math.max(maxY, parseFloat(match[2])),
      }
    },
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  )
}
