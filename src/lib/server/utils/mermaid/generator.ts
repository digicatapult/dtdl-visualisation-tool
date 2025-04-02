import os from 'node:os'
import path from 'node:path'
import url from 'node:url'

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import type { LayoutLoaderDefinition, Mermaid, MermaidConfig } from 'mermaid'
import puppeteer, { Browser, Page } from 'puppeteer'
import { container, inject, singleton } from 'tsyringe'

import { Semaphore } from 'async-mutex'
import { Env } from '../../env/index.js'
import { Logger, type ILogger } from '../../logger.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { Layout } from '../../models/mermaidLayouts.js'
import { MermaidSvgRender, PlainTextRender } from '../../models/renderedDiagram/index.js'
import ClassDiagram from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart from './flowchart.js'

const env = container.resolve(Env)

const mermaidJsPath = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.resolve('mermaid', import.meta.url))),
  'mermaid.js'
)
const mermaidHTMLPath = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.resolve('@mermaid-js/mermaid-cli', import.meta.url))),
  '..',
  'dist',
  'index.html'
)

type GlobalExtMermaidAndElk = {
  mermaid: Mermaid
  elkLayouts: LayoutLoaderDefinition[]
}

@singleton()
export class SvgGenerator {
  private init: Promise<Browser>
  private pagePool: Page[] = []
  private numPages: number
  private semaphore: Semaphore
  private mermaidMarkdownByDiagramType: {
    [k in DiagramType]: IDiagram<k>
  } = {
    flowchart: new Flowchart(),
    classDiagram: new ClassDiagram(),
  }

  constructor(
    @inject(Logger) private logger: ILogger,
    numPages: number = os.cpus().length - 2
  ) {
    this.numPages = numPages
    this.init = this.initialise()
    this.semaphore = new Semaphore(this.numPages)
  }

  async run(
    dtdlObject: DtdlObjectModel,
    diagramType: DiagramType,
    layout: Layout,
    isRetry: boolean = false
  ): Promise<MermaidSvgRender | PlainTextRender> {
    const { page, release } = await this.getAvailablePage()
    try {
      // Try this first to fail before using resources creating graph
      const graph = this.mermaidMarkdownByDiagramType[diagramType].generateMarkdown(dtdlObject, ' TD')
      if (!graph) {
        this.releasePage(page, release)
        return new PlainTextRender('No graph')
      }

      const data = await this.render(page, layout, graph)

      this.releasePage(page, release)
      return new MermaidSvgRender(data)
    } catch (err) {
      this.logger.warn('Something went wrong rendering mermaid layout', err)
      if (!isRetry) {
        this.logger.info('Attempting to relaunch puppeteer')

        await this.tryCloseBrowser(page)
        this.reInitialise()
        return this.run(dtdlObject, diagramType, layout, true)
      }
      this.logger.error('Something went wrong rendering mermaid layout', err)
      throw err
    }
  }

  private async tryCloseBrowser(page: Page) {
    try {
      // Another run function could have caused a browser to change so await it again
      const browser = await this.init
      // This logic would only close the browser if the pages browser was older than the new browser created from a different crash/create new browser event
      if (!page || page.browser() === browser) await browser.close()
    } catch (err) {
      this.logger.warn('Failed to close browser %s', err instanceof Error ? err.message : err)
    }
  }

  private async getAvailablePage(): Promise<{ page: Page; release: () => void }> {
    await this.init
    const acquireLock = await this.semaphore.acquire()
    const page = this.pagePool.pop()
    const release = acquireLock[1]
    if (!page) {
      throw new Error('No page available, potential semaphore fail')
    }
    return { page, release }
  }

  private releasePage(page: Page, release: () => void) {
    this.pagePool.push(page)
    release()
  }

  async initialise(isRetry: boolean = false) {
    // this can throw
    let browser: Browser
    try {
      browser = await puppeteer.launch({
        args: env.get('PUPPETEER_ARGS'),
      })
    } catch (err) {
      if (!isRetry) {
        this.logger.info('Attempting to relaunch puppeteer')

        browser = await puppeteer.launch({
          args: env.get('PUPPETEER_ARGS'),
        })
      } else {
        this.logger.error('Something went wrong rendering mermaid layout', err)
        throw err
      }
    }

    for (let i = 0; i < this.numPages; i++) {
      const page = await browser.newPage()

      page.on('console', (msg) => {
        this.logger.warn(msg.text())
      })

      await page.goto(url.pathToFileURL(mermaidHTMLPath).href)
      await page.addScriptTag({ path: mermaidJsPath })
      await page.evaluate(async () => {
        await Promise.all(Array.from(document.fonts, (font) => font.load()))
        const { mermaid, elkLayouts } = globalThis as unknown as GlobalExtMermaidAndElk
        mermaid.registerLayoutLoaders(elkLayouts)
      })
      this.pagePool.push(page)
    }
    return browser
  }

  async reInitialise() {
    this.pagePool = []
    this.semaphore = new Semaphore(this.numPages)
    this.init = this.initialise()
  }

  private async render(page: Page, layout: Layout, definition: string) {
    const svgId = 'mermaid-svg'
    const mermaidConfig: MermaidConfig = {
      flowchart: {
        useMaxWidth: false,
        htmlLabels: false,
      },
      maxTextSize: 99999999,
      securityLevel: 'strict',
      maxEdges: 99999999,
      layout,
    }

    const svg = await page.$eval(
      '#container',
      async (container, mermaidConfig, definition, svgId) => {
        const { mermaid } = globalThis as unknown as GlobalExtMermaidAndElk

        mermaid.initialize({ startOnLoad: false, ...mermaidConfig })
        const { svg: svgText } = await mermaid.render(svgId, definition, container)
        container.innerHTML = svgText

        const svg = container.getElementsByTagName?.('svg')?.[0]
        const xmlSerializer = new XMLSerializer()
        return xmlSerializer.serializeToString(svg)
      },
      mermaidConfig,
      definition,
      svgId
    )

    return Buffer.from(svg)
  }
}
