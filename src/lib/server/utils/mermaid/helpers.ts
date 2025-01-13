import { InternalError } from '../../errors.js'
import { DtdlId, MermaidId } from '../../models/strings.js'

export type BoundingBox = {
  x: number
  y: number
  width: number
  height: number
  left: number
  right: number
  top: number
  bottom: number
}

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

export function boundingBoxIntersects(a: BoundingBox, b: BoundingBox) {
  return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom
}

export function boundingBoxFromBoundary(left: number, right: number, top: number, bottom: number) {
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    x: 0.5 * (left + right),
    y: 0.5 * (top + bottom),
  }
}

export function translateBoundingBox(boundingBox: BoundingBox, dx: number, dy: number) {
  return {
    left: boundingBox.left + dx,
    right: boundingBox.right + dx,
    top: boundingBox.top + dy,
    bottom: boundingBox.bottom + dy,
    width: boundingBox.width,
    height: boundingBox.height,
    x: boundingBox.x + dx,
    y: boundingBox.y + dy,
  }
}

const translateRegex = /translate\(\s*([-\d.]+)[ ,\s]*([-\d.]+)\s*\)/
export function extractTransformTranslateCoords(element: Element) {
  const transform = element.getAttribute('transform')
  const result = transform && transform.match(translateRegex)
  if (!result) {
    throw new InternalError(`Expected translate in transform attribute on element ${element.id}`)
  }
  return {
    x: parseFloat(result[1]),
    y: parseFloat(result[2]),
  }
}

const pathRegex = /[ML](?:(-{0,1}\d+(?:\.\d+){0,1})\s+(-{0,1}\d+(?:\.\d+){0,1}))/g
export function extractPathExtents(element: Element) {
  const dAttr = element.getAttribute('d')
  const pairs = dAttr && Array.from(dAttr.matchAll(pathRegex))
  if (!pairs || !pairs.length) {
    throw new InternalError(`Expected lengths in d attribute on path element ${element.id}`)
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
