import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import mermaid from 'mermaid'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { QueryParams } from '../../models/contollerTypes.js'
import { MermaidId } from '../../models/strings.js'
import Flowchart, { Direction } from './flowchart.js'
type GeneratorOption = (g: Generator) => void

@singleton()
export class Generator {
  public browser: Promise<Browser>
  constructor(...options: GeneratorOption[]) {
    this.browser = puppeteer.launch({})

    for (const option of options) {
      option(this)
    }
  }

  mermaidMarkdownByChartType(
    dtdlObject: DtdlObjectModel,
    chartType: QueryParams['chartType'],
    highlightNodeId?: MermaidId
  ): string {
    switch (chartType) {
      case 'flowchart':
        return new Flowchart().getFlowchartMarkdown(dtdlObject, Direction.TopToBottom, highlightNodeId) ?? 'No graph'
      default:
        return 'No graph'
    }
  }

  async parseGraph(graph: string): Promise<boolean> {
    if ((await mermaid.parse(graph, { suppressErrors: true })) == false) {
      return false
    }
    return true
  }

  async run(dtdlObject: DtdlObjectModel, params: QueryParams): Promise<string> {
    //  Mermaid config
    const parseMDDOptions: ParseMDDOptions = {
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
    if (!(await this.parseGraph(graph))) {
      return 'No Graph'
    }
    const { data } = await renderMermaid(await this.browser, graph, params.output, parseMDDOptions)
    const decoder = new TextDecoder()
    return decoder.decode(data)
  }
}
