import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import puppeteer, { Browser } from 'puppeteer'
import { inject, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import { Layout } from '../../models/mermaidLayouts.js'
import { MermaidSvgRender, PlainTextRender } from '../../models/renderedDiagram/index.js'
import ClassDiagram from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart from './flowchart.js'

@singleton()
export class SvgGenerator {
  public browser: Promise<Browser>
  constructor(@inject(Logger) private logger: ILogger) {
    this.browser = puppeteer.launch({})
  }

  mermaidMarkdownByDiagramType: {
    [k in DiagramType]: IDiagram<k>
  } = {
    flowchart: new Flowchart(),
    classDiagram: new ClassDiagram(),
  }

  async run(
    dtdlObject: DtdlObjectModel,
    diagramType: DiagramType,
    layout: Layout,
    options: ParseMDDOptions = {},
    isRetry: boolean = false
  ): Promise<MermaidSvgRender | PlainTextRender> {
    try {
      //  Mermaid config
      const parseMDDOptions: ParseMDDOptions = {
        ...options,
        svgId: 'mermaid-svg',
        mermaidConfig: {
          flowchart: {
            useMaxWidth: false,
            htmlLabels: false,
          },
          maxTextSize: 99999999,
          securityLevel: 'strict',
          maxEdges: 99999999,
          layout,
        },
      }

      const graph = this.mermaidMarkdownByDiagramType[diagramType].generateMarkdown(dtdlObject, ' TD')
      if (!graph) {
        return new PlainTextRender('No graph')
      }

      const { data } = await renderMermaid(await this.browser, graph, 'svg', parseMDDOptions)
      return new MermaidSvgRender(Buffer.from(data))
    } catch (err) {
      this.logger.warn('Something went wrong rendering mermaid layout', err)
      if (!isRetry) {
        this.logger.info('Attempting to relaunch puppeteer')

        const oldBrowser = await this.browser
        await oldBrowser.close()

        this.browser = puppeteer.launch({})
        return this.run(dtdlObject, diagramType, layout, options, true)
      }
      this.logger.error('Something went wrong rendering mermaid layout', err)
      throw err
    }
  }
}
