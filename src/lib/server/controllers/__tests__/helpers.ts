import { PropsWithChildren } from '@kitajs/html'
import { Readable } from 'node:stream'
import { pino } from 'pino'
import Flowchart, { Direction, Relationship } from '../../utils/mermaid/flowchart'
import MermaidTemplates from '../../views/components/mermaid'

export const templateMock = {
  flowchart: (props: PropsWithChildren<{ graph: string }>) => `root_${props.graph}_root`,
} as MermaidTemplates
export const mockLogger = pino({ level: 'silent' })
export const flowhchartMock = {
  generateFlowchart: (relationships: Array<Relationship>, direction: Direction) => {
    const tmp: Array<string> = []
    tmp.push('flowchart')
    tmp.push(direction)
    for (const i in relationships) {
      tmp.push(relationships[i].id)
    }
    return tmp.join('')
  },
} as Flowchart
export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
