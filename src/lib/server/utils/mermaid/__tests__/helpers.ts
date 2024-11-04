import { JSDOM } from 'jsdom'

export const checkIfStringIsSVG = (svgString: string): boolean => {
  const dom = new JSDOM(svgString, { contentType: 'image/svg+xml' })
  const document = dom.window.document
  const svgElement = document.querySelector('svg')
  if (!svgElement) return false
  return true
}
