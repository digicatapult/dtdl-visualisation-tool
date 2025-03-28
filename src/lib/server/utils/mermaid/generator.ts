import os from 'node:os'
import path from 'node:path'
import url from 'node:url'

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import type { LayoutLoaderDefinition, Mermaid, MermaidConfig } from 'mermaid'
import puppeteer, { Browser, Page } from 'puppeteer'
import { container, inject, singleton } from 'tsyringe'

import { Mutex, Semaphore } from 'async-mutex'
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
  private init: Promise<{ browser: Browser; pagePool: Page[]; semaphore: Semaphore }>
  private mermaidMarkdownByDiagramType: {
    [k in DiagramType]: IDiagram<k>
  } = {
    flowchart: new Flowchart(),
    classDiagram: new ClassDiagram(),
  }
  protected mutex = new Mutex()

  constructor(@inject(Logger) private logger: ILogger) {
    this.init = this.initialise()
  }

  async run(
    dtdlObject: DtdlObjectModel,
    diagramType: DiagramType,
    layout: Layout,
    isRetry: boolean = false
  ): Promise<MermaidSvgRender | PlainTextRender> {
    // If a call to render for whatever reason cannot acquire a page it throws here without interrupting other renders
    const lockedPage = await this.getAvailablePage()
    if (!lockedPage) {
      throw new Error('No available page could be acquired')
    }
    const [page, releaseSemaphore] = lockedPage
    try {
      const graph = this.mermaidMarkdownByDiagramType[diagramType].generateMarkdown(dtdlObject, ' TD')
      if (!graph) {
        return new PlainTextRender('No graph')
      }
      const data = await this.render(page, layout, graph)
      releaseSemaphore()
      return new MermaidSvgRender(data)
    } catch (err) {
      this.logger.warn('Something went wrong rendering mermaid layout', err)
      if (!isRetry) {
        this.logger.info('Attempting to relaunch puppeteer')

        await this.tryCloseBrowser(page)
        this.init = this.initialise()
        return this.run(dtdlObject, diagramType, layout, true)
      }
      this.logger.error('Something went wrong rendering mermaid layout', err)
      throw err
    }
  }

  private async tryCloseBrowser(page: Page) {
    try {
      const { browser } = await this.init
      if (browser === page.browser()) await browser.close()
    } catch (err) {
      this.logger.warn('Failed to close browser %s', err instanceof Error ? err.message : err)
    }
  }

  async initialise() {
    const browser = await puppeteer.launch({
      args: env.get('PUPPETEER_ARGS'),
    })
    const numPages = os.cpus().length - 2
    this.logger.info(`Initializing ${numPages} Puppeteer pages`)

    const pagePool: Page[] = []
    for (let i = 1; i <= numPages; i++) {
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

      pagePool.push(page)
    }
    const semaphore = new Semaphore(numPages)
    return { browser, pagePool, semaphore }
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

  private async getAvailablePage(): Promise<[Page, () => void] | undefined> {
    const { pagePool, semaphore } = await this.init
    // waits here to receive a value from the semaphore
    const acquiredSemaphore = await semaphore.acquire()
    const release = acquiredSemaphore[1]
    const page = pagePool.pop()
    if (!page) {
      release()
      return undefined
    }
    return [
      page,
      () => {
        pagePool.push(page)
        release()
      },
    ]
  }
}
