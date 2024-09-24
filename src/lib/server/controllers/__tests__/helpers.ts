import { PropsWithChildren } from '@kitajs/html'
import { Readable } from 'node:stream'
import { pino } from 'pino'
import Flowchart from '../../utils/mermaid/flowchart'
import MermaidTemplates from '../../views/components/mermaid'
import type * as express from 'express'
import { mockDtdlObjectModel } from '../../utils/mermaid/__tests__/flowchart.test'

export const templateMock = {
  flowchart: (props: PropsWithChildren<{ graph: string }>) => `root_${props.graph}_root`,
} as MermaidTemplates
export const mockLogger = pino({ level: 'silent' })
export const flowhchartMock = {
  getFlowchartMarkdown: () => {
    const tmp: Array<string> = []
    tmp.push('flowchart')
    tmp.push(' TD')
    tmp.push('\n\tdtmi:com:example --- dtmi:com:example:base((&#34;undefined &#34;))')
    tmp.push('\ndtmi:com:example((&#34;undefined &#34;))')
    return tmp.join('')
  },
} as unknown as Flowchart
export const mockRequestObject = {
  app: {
    get: () => {
      return mockDtdlObjectModel
    }
  }
} as unknown as express.Request
export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
