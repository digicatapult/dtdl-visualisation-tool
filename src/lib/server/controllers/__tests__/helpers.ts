import { Readable } from 'node:stream'
import { pino } from 'pino'
import { DtdlLoader } from '../../utils/dtdl/dtdlLoader'
import { mockDtdlObjectModel } from '../../utils/mermaid/__tests__/flowchart.test'
import MermaidTemplates from '../../views/components/mermaid'

export const templateMock = {
  MermaidRoot: ({ graph }: { graph: string }) => `root_${graph}_root`,
} as unknown as MermaidTemplates
export const mockLogger = pino({ level: 'silent' })

export const mockDtdlLoader: DtdlLoader = new DtdlLoader(mockDtdlObjectModel)

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
