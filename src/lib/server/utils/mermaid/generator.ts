import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import puppeteer, { Browser, LaunchOptions } from 'puppeteer'
import { singleton } from 'tsyringe'
import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import Flowchart, { Direction } from './flowchart.js'
import { QueryParams } from '../../controllers/root.js'
import { MermaidId } from '../../models/strings.js'
type GeneratorOption = (g: Generator,) => void

@singleton()
export class Generator {
    public browser: any
    constructor(
        ...options: GeneratorOption[]
    ) {
        this.browser = null

        for (const option of options) {
            option(this)
        }

    }

    private mermaidMarkdownByChartType(dtdlObject: DtdlObjectModel, chartType: QueryParams['chartType'], highlightNodeId?: MermaidId): string {
        switch (chartType) {
            case 'flowchart':
                return new Flowchart(dtdlObject).getFlowchartMarkdown(Direction.TopToBottom, highlightNodeId)
            default:
                return new Flowchart(dtdlObject).getFlowchartMarkdown(Direction.TopToBottom)

        }
    }

    public static async createBrowser(puppeteerLaunchOptions: LaunchOptions) {
        const browser: Browser = await puppeteer.launch(puppeteerLaunchOptions)
        return (g: Generator): void => {
            g.browser = browser
        }
    }

    public async run(
        dtdlObject: DtdlObjectModel,
        params: QueryParams
    ): Promise<string> {
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
                layout: params.layout
            }
        }
        const { data } = await renderMermaid(
            this.browser,
            this.mermaidMarkdownByChartType(dtdlObject, params.chartType, params.highlightNodeId),
            params.output ? params.output : 'svg',
            parseMDDOptions)
        const decoder = new TextDecoder()
        return decoder.decode(data)
    }
}
