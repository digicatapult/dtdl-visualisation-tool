import path from 'node:path'
import url from 'node:url'

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import type { LayoutLoaderDefinition, Mermaid, MermaidConfig } from 'mermaid'
import puppeteer, { Browser, Page } from 'puppeteer'
import { inject, singleton } from 'tsyringe'

import { Semaphore } from 'async-mutex'
import { Env } from '../../env/index.js'
import { Logger, type ILogger } from '../../logger.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { Layout } from '../../models/mermaidLayouts.js'
import { MermaidSvgRender, PlainTextRender } from '../../models/renderedDiagram/index.js'
import { Pool, type IPool } from '../../pool.js'
import ClassDiagram from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart from './flowchart.js'

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
  private browser: Promise<Browser>
  private pagePool: Promise<{ pages: Page[]; semaphore: Semaphore }>
  private mermaidMarkdownByDiagramType: {
    [k in DiagramType]: IDiagram<k>
  } = {
    flowchart: new Flowchart(),
    classDiagram: new ClassDiagram(),
  }

  constructor(
    @inject(Logger) private logger: ILogger,
    @inject(Pool) private poolSize: IPool,
    @inject(Env) private env: Env
  ) {
    this.browser = this.initialiseBrowser()
    this.pagePool = this.initialisePagePool(this.poolSize)
  }

  async run(
    dtdlObject: DtdlObjectModel,
    diagramType: DiagramType,
    layout: Layout,
    isRetry: boolean = false
  ): Promise<MermaidSvgRender | PlainTextRender> {
    const dtdlSize = this.countRenderableEntities(dtdlObject)
    if (dtdlSize > this.env.get('MAX_DTDL_OBJECT_SIZE')) {
      this.logger.debug(
        `DtdlObject size ${dtdlSize} exceeds maximum allowed size ${this.env.get('MAX_DTDL_OBJECT_SIZE')}`
      )
      return new PlainTextRender(
        'For optimal performance, the full ontology file is too large to load at once. Please load a subset of nodes or relationships via the search bar'
      )
    }
    const { page, release } = await this.getAvailablePage()
    try {
      // Try this first to fail before using resources creating graph
      const graph = this.mermaidMarkdownByDiagramType[diagramType].generateMarkdown(dtdlObject, ' TD')
      if (!graph) {
        this.releasePage(page, release)
        return new PlainTextRender('The filtered ontology has no entities to display')
      }

      const data = await this.render(page, layout, graph)

      this.releasePage(page, release)
      return new MermaidSvgRender(data)
    } catch (err) {
      this.logger.warn(err, 'Something went wrong rendering mermaid layout')
      if (!isRetry) {
        this.logger.info('Attempting to relaunch puppeteer')

        await this.tryCloseBrowser(page)
        this.browser = this.initialiseBrowser()
        this.pagePool = this.initialisePagePool(this.poolSize)
        return this.run(dtdlObject, diagramType, layout, true)
      }
      this.logger.error(err, 'Something went wrong rendering mermaid layout')
      throw err
    }
  }

  private countRenderableEntities(dtdlObject: DtdlObjectModel): number {
    return Object.entries(dtdlObject).reduce((count, [, entityType]) => {
      if (
        entityType.EntityKind === 'Interface' ||
        entityType.EntityKind === 'Property' ||
        entityType.EntityKind === 'Relationship'
      ) {
        return count + 1
      }
      return count
    }, 0)
  }

  private async tryCloseBrowser(page: Page) {
    try {
      // Another run function could have caused a browser to change so await it again
      const browser = await this.browser
      // This logic would only close the browser if the pages browser was older than the new browser created from a different crash/create new browser event
      if (!page || page.browser() === browser) await browser.close()
    } catch (err) {
      this.logger.warn(err, 'Failed to close browser')
    }
  }

  private async getAvailablePage(): Promise<{ page: Page; release: () => void }> {
    const { pages, semaphore } = await this.pagePool
    const acquireLock = await semaphore.acquire()
    const page = pages.pop()
    const release = acquireLock[1]
    if (!page) {
      throw new Error('No page available, potential semaphore fail')
    }
    return { page, release }
  }

  private async releasePage(page: Page, release: () => void) {
    const { pages } = await this.pagePool
    pages.push(page)
    release()
  }

  async initialiseBrowser(isRetry: boolean = false): Promise<Browser> {
    try {
      return await puppeteer.launch({
        args: this.env.get('PUPPETEER_ARGS'),
      })
    } catch (err) {
      if (!isRetry) {
        this.logger.info('Attempting to relaunch puppeteer')
        return await this.initialiseBrowser(true)
      }
      this.logger.error(err, 'Something went wrong rendering mermaid layout')
      throw err
    }
  }

  async initialisePagePool(poolSize: number) {
    const browser = await this.browser
    const pages: Page[] = []
    for (let i = 0; i < poolSize; i++) {
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
      pages.push(page)
    }

    const semaphore = new Semaphore(poolSize)

    return { pages, semaphore }
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
