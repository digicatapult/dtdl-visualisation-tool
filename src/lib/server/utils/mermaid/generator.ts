import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { QueryParams } from '../../models/contollerTypes.js'
import { MermaidId } from '../../models/strings.js'
import Flowchart, { Direction } from './flowchart.js'

@singleton()
export class SvgGenerator {
  private flowchart = new Flowchart()
  public browser: Promise<Browser>
  constructor() {
    this.browser = puppeteer.launch({})
  }

  mermaidMarkdownByChartType(
    dtdlObject: DtdlObjectModel,
    chartType: QueryParams['chartType'],
    highlightNodeId?: MermaidId
  ): string {
    switch (chartType) {
      case 'flowchart':
        return this.flowchart.getFlowchartMarkdown(dtdlObject, Direction.TopToBottom, highlightNodeId) ?? 'No graph'
      default:
        return 'No graph'
    }
  }

  async run(dtdlObject: DtdlObjectModel, params: QueryParams, options: ParseMDDOptions = {}): Promise<string> {
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
        securityLevel: 'loose',
        maxEdges: 99999999,
        layout: params.layout,
      },
    }
    const graph = this.mermaidMarkdownByChartType(dtdlObject, params.chartType, params.highlightNodeId)

    const { data } = await renderMermaid(await this.browser, graph, params.output, parseMDDOptions)
    const decoder = new TextDecoder()
    return decoder.decode(data)
  }
}
