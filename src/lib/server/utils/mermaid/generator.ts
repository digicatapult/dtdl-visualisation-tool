import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { ChartTypes, QueryParams } from '../../models/contollerTypes.js'
import { MermaidId } from '../../models/strings.js'
import { DtdlModelWithMetadata } from '../dtdl/filter.js'
import Flowchart, { Direction } from './flowchart.js'

@singleton()
export class SvgGenerator {
  private flowchart = new Flowchart()
  public browser: Promise<Browser>
  constructor() {
    this.browser = puppeteer.launch({})
  }

  mermaidMarkdownByChartType: Record<
    ChartTypes,
    (dtdlObject: DtdlModelWithMetadata, highlightNodeId?: MermaidId) => string | null
  > = {
    flowchart: (dtdlObject, highlightNodeId) =>
      this.flowchart.getFlowchartMarkdown(dtdlObject, Direction.TopToBottom, highlightNodeId),
  }

  async run(dtdlObject: DtdlModelWithMetadata, params: QueryParams, options: ParseMDDOptions = {}): Promise<string> {
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

    const graph = this.mermaidMarkdownByChartType[params.chartType](dtdlObject, params.highlightNodeId)
    if (!graph) return 'No graph'

    const { data } = await renderMermaid(await this.browser, graph, params.output, parseMDDOptions)
    const decoder = new TextDecoder()
    return decoder.decode(data)
  }
}
