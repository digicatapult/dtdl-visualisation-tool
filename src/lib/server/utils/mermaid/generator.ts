import { renderMermaid, type ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import puppeteer, { Browser, LaunchOptions } from 'puppeteer'
import { singleton } from 'tsyringe'
import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import Flowchart, { Direction } from './flowchart.js'
import { QueryParams } from '../../controllers/root.js'
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
    
    private mermaidMarkdownByChartType(dtdlObject: DtdlObjectModel,chartType: QueryParams['chartType']):string {
        switch (chartType) {
            case 'flowchart':
                return new Flowchart(dtdlObject).getFlowchartMarkdown(Direction.TopToBottom)
        }
    }

    public static async createBrowser (puppeteerLaunchOptions: LaunchOptions)
    {
        const browser: Browser = await puppeteer.launch(puppeteerLaunchOptions)
        return (g: Generator): void => {
            g.browser = browser
        }
    }

    public async run(
        dtdlObject: DtdlObjectModel,
        queryParams: QueryParams
    ): Promise<string>
    {
        //  Mermaid config
        const parseMDDOptions: ParseMDDOptions = {
            mermaidConfig: {
                securityLevel: 'loose',
                layout:queryParams.layout
            }
        }
        const { data } = await renderMermaid(
            this.browser,
            this.mermaidMarkdownByChartType(dtdlObject,queryParams.chartType), 
            queryParams.output, 
            parseMDDOptions)
        const decoder = new TextDecoder()
        return decoder.decode(data)
    }
}
