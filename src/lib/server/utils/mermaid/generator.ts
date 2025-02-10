import path from 'node:path'
import url from 'node:url'

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import type { MermaidConfig } from 'mermaid'
import puppeteer, { Browser, Page } from 'puppeteer'
import { inject, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { Layout } from '../../models/mermaidLayouts.js'
import { MermaidSvgRender, PlainTextRender } from '../../models/renderedDiagram/index.js'
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

@singleton()
export class SvgGenerator {
  private init: Promise<{ browser: Browser; page: Page }>
  private mermaidMarkdownByDiagramType: {
    [k in DiagramType]: IDiagram<k>
  } = {
    flowchart: new Flowchart(),
    classDiagram: new ClassDiagram(),
  }

  constructor(@inject(Logger) private logger: ILogger) {
    this.init = this.initialise()
  }

  async run(
    dtdlObject: DtdlObjectModel,
    diagramType: DiagramType,
    layout: Layout,
    isRetry: boolean = false
  ): Promise<MermaidSvgRender | PlainTextRender> {
    try {
      const graph = this.mermaidMarkdownByDiagramType[diagramType].generateMarkdown(dtdlObject, ' TD')
      if (!graph) {
        return new PlainTextRender('No graph')
      }

      const data = await this.render(layout, graph)
      return new MermaidSvgRender(data)
    } catch (err) {
      this.logger.warn('Something went wrong rendering mermaid layout', err)
      if (!isRetry) {
        this.logger.info('Attempting to relaunch puppeteer')

        await this.tryCloseBrowser()
        this.init = this.initialise()
        return this.run(dtdlObject, diagramType, layout, true)
      }
      this.logger.error('Something went wrong rendering mermaid layout', err)
      throw err
    }
  }

  private async tryCloseBrowser() {
    try {
      const { browser } = await this.init
      await browser.close()
    } catch (err) {
      this.logger.warn('Failed to close browser %s', err instanceof Error ? err.message : err)
    }
  }

  private async initialise() {
    const browser = await puppeteer.launch({})
    const page = await browser.newPage()

    page.on('console', (msg) => {
      this.logger.warn(msg.text())
    })

    await page.goto(url.pathToFileURL(mermaidHTMLPath).href)
    await page.addScriptTag({ path: mermaidJsPath })
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.fonts, (font) => font.load()))
      const { mermaid, elkLayouts } = globalThis as any
      mermaid.registerLayoutLoaders(elkLayouts)
    })

    return { browser, page }
  }

  private async render(layout: Layout, definition: string) {
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

    const { page } = await this.init
    const svg = await page.$eval(
      '#container',
      async (container, mermaidConfig, definition, svgId) => {
        const { mermaid } = globalThis as any

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
