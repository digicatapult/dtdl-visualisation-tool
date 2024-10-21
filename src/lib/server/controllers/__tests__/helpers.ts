import express from 'express'
import { Readable } from 'node:stream'
import { pino } from 'pino'

import { Layout } from '../../models/mermaidLayouts.js'
import { DtdlLoader } from '../../utils/dtdl/dtdlLoader'
import { mockDtdlObjectModel } from '../../utils/mermaid/__tests__/flowchart.test'
import MermaidTemplates from '../../views/components/mermaid'

export const templateMock = {
  MermaidRoot: ({ graph, layout }: { graph: string; layout: string }) => `root_${graph}_${layout}_root`,
  mermaidMarkdown: ({ graph, layout }: { graph: string; layout?: Layout }) =>
    `mermaidMarkdown_${graph}_${layout}_mermaidMarkdown`,
  layoutForm: ({ layout, swapOutOfBand }: { layout: Layout; swapOutOfBand?: boolean }) =>
    `layoutForm_${layout}_${swapOutOfBand || false}_layoutForm`,
} as unknown as MermaidTemplates
export const mockLogger = pino({ level: 'silent' })

export const mockDtdlLoader: DtdlLoader = new DtdlLoader(mockDtdlObjectModel)

export const toHTMLString = async (...streams: Readable[]) => {
  const chunks: Uint8Array[] = []
  for (const stream of streams) {
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array)
    }
  }
  return Buffer.concat(chunks).toString('utf8')
}

export const mockReq = (headers: Record<string, string>) => {
  return {
    header: (key: string) => headers[key],
  } as unknown as express.Request
}
