import { expect } from 'chai'
import * as envalid from 'envalid'
import { JSDOM } from 'jsdom'
import mermaid, { ParseResult } from 'mermaid'
import path from 'path'
import puppeteer from 'puppeteer'
import { container } from 'tsyringe'
import { Env, ENV_CONFIG, envConfig } from '../../../env/index.js'

const env = container.resolve(Env)

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
  const browser = await puppeteer.launch({
    args: env.get('PUPPETEER_ARGS'),
  })
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

export const getChildrenByClass = (element: Element, className: string): Element[] => {
  return [...element.childNodes].filter((c) => {
    if (!('classList' in c) || !c.classList) {
      return false
    }
    const classSet = new Set(c.classList.toString().split(/\s+/))
    return classSet.has(className)
  }) as Element[]
}

export const mockEnvClass = (
  overrides: Partial<Record<keyof ENV_CONFIG, string | number | boolean | [string, ...string[]]>> = {}
) =>
  ({
    get: (key: keyof ENV_CONFIG) => {
      return envalid.cleanEnv({ ...process.env, ...overrides }, envConfig)[key]
    },
  }) as Env
