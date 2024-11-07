import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import puppeteer, { Browser } from 'puppeteer'
import { singleton } from 'tsyringe'
import { QueryParams } from '../../models/controllerTypes.js'
import { DiagramType } from '../../models/mermaidDiagrams.js'
import ClassDiagram from './classDiagram.js'
import { IDiagram } from './diagramInterface.js'
import Flowchart from './flowchart.js'

@singleton()
export class SvgGenerator {
  public browser: Promise<Browser>
  constructor() {
    this.browser = puppeteer.launch({})
  }

  mermaidMarkdownByDiagramType: {
    [k in DiagramType]: IDiagram<k>
  } = {
    flowchart: new Flowchart(),
    classDiagram: new ClassDiagram(),
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

    const graph = this.mermaidMarkdownByDiagramType[params.diagramType].generateMarkdown(
      dtdlObject,
      ' TD',
      params.highlightNodeId
    )
    if (!graph) return 'No graph'

    const { data } = await renderMermaid(await this.browser, graph, params.output, parseMDDOptions)
    const decoder = new TextDecoder()
    return decoder.decode(data)
  }
}
