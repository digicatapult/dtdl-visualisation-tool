import express from 'express'
import { Readable } from 'node:stream'
import { pino } from 'pino'

import { Layout } from '../../models/mermaidLayouts.js'
import { DtdlLoader } from '../../utils/dtdl/dtdlLoader'
import { mockDtdlObjectModel, simpleMockDtdlObjectModel } from '../../utils/mermaid/__tests__/fixtures'
import { Generator } from '../../utils/mermaid/generator.js'
import MermaidTemplates from '../../views/components/mermaid'

export const templateMock = {
  MermaidRoot: ({ search, layout }: { search: string; layout: string }) => `root_${layout}_${search}_root`,
  mermaidTarget: ({ generatedOutput, target }: { generatedOutput?: JSX.Element; target: string }): JSX.Element =>
    `mermaidTarget_${generatedOutput}_${target}_mermaidTarget`,
  layoutForm: ({ search, layout, swapOutOfBand }: { search?: string; layout: Layout; swapOutOfBand?: boolean }) =>
    `layoutForm_${search}_${layout}_${swapOutOfBand || false}_layoutForm`,
} as unknown as MermaidTemplates
export const mockLogger = pino({ level: 'silent' })

export const mockDtdlLoader: DtdlLoader = new DtdlLoader(mockDtdlObjectModel)

export const simpleMockDtdlLoader: DtdlLoader = new DtdlLoader(simpleMockDtdlObjectModel)

export const mockGenerator: Generator = new Generator()

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
