import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import mermaid, { ParseResult } from 'mermaid'
import path from 'path'
import puppeteer from 'puppeteer'

declare global {
  interface Window {
    mermaid: typeof mermaid
  }
}
const mermaidPath = path.resolve('./node_modules/mermaid/dist/mermaid.min.js')

export const checkIfStringIsSVG = (svgString: string): boolean => {
  const dom = new JSDOM(svgString, { contentType: 'image/svg+xml' })
  const document = dom.window.document
  const svgElement = document.querySelector('svg')
  if (!svgElement) return false
  return true
}

export const parseMermaid = async (markdown: string): Promise<ParseResult> => {
  const browser = await puppeteer.launch({})
  const page = await browser.newPage()

  await page.addScriptTag({ path: mermaidPath })

  const parsedMermaid = await page.evaluate((markdown) => {
    return window.mermaid.parse(markdown)
  }, markdown)

  await browser.close()
  return parsedMermaid
}

export function withGroupElement(): Element {
  const dom = new JSDOM()
  const document = dom.window.document
  return document.createElement('g')
}

export function withPathElement(): Element {
  const dom = new JSDOM()
  const document = dom.window.document
  return document.createElement('path')
}

export const expectStringIsFiniteNumber = (x: string | null) => {
  expect(x).to.be.a('string')
  expect(Number.isFinite(parseFloat(x || 'NaN'))).to.equal(true)
}
