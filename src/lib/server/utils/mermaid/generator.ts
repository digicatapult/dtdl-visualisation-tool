import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { QueryParams } from '../../models/contollerTypes.js'
import { MermaidId } from '../../models/strings.js'
import Flowchart from './flowchart.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import ClassDiagram from './classDiagram.js'

@singleton()
export class SvgGenerator {
  private flowchart = new Flowchart()
  private classDiagram = new ClassDiagram()
  public browser: Promise<Browser>
  constructor() {
    this.browser = puppeteer.launch({})
  }

  mermaidMarkdownByChartType: Record<
    DiagramType,
    (dtdlObject: DtdlObjectModel, highlightNodeId?: MermaidId) => string | null
  > = {
    flowchart: (dtdlObject, highlightNodeId) => this.flowchart.generateMarkdown(dtdlObject, highlightNodeId),
    classDiagram: (dtdlObject, highlightNodeId) => this.classDiagram.generateMarkdown(dtdlObject, highlightNodeId)
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

    const graph = this.mermaidMarkdownByChartType[params.diagramType](dtdlObject, params.highlightNodeId)
    if (!graph) return 'No graph'

    const { data } = await renderMermaid(await this.browser, graph, params.output, parseMDDOptions)
    const decoder = new TextDecoder()
    return decoder.decode(data)
  }
}
