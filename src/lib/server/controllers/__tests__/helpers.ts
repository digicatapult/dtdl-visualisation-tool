import express from 'express'
import { LRUCache } from 'lru-cache'
import { Readable } from 'node:stream'
import { pino } from 'pino'

import sinon from 'sinon'
import { Layout } from '../../models/mermaidLayouts.js'
import { DtdlLoader } from '../../utils/dtdl/dtdlLoader'
import {
  generatedSVGFixture,
  mockDtdlObjectModel,
  simpleMockDtdlObjectModel,
} from '../../utils/mermaid/__tests__/fixtures'
import { SvgGenerator } from '../../utils/mermaid/generator.js'
import MermaidTemplates from '../../views/components/mermaid'

export const templateMock = {
  MermaidRoot: ({ search, layout }: { search: string; layout: string }) => `root_${layout}_${search}_root`,
  mermaidTarget: ({ generatedOutput, target }: { generatedOutput?: JSX.Element; target: string }): JSX.Element =>
    `mermaidTarget_${generatedOutput}_${target}_mermaidTarget`,
  searchPanel: ({ search, layout, swapOutOfBand }: { search?: string; layout: Layout; swapOutOfBand?: boolean }) =>
    `searchPanel_${search}_${layout}_${swapOutOfBand || false}_searchPanel`,
} as unknown as MermaidTemplates
export const mockLogger = pino({ level: 'silent' })
export const mockCache = new LRUCache<string, string>({
  max: 10,
  ttl: 1000 * 60,
  allowStale: true,
})

export const mockDtdlLoader: DtdlLoader = new DtdlLoader(mockDtdlObjectModel)

export const simpleMockDtdlLoader: DtdlLoader = new DtdlLoader(simpleMockDtdlObjectModel)

export const generatorRunStub = sinon.stub().resolves(generatedSVGFixture)
export const mockGenerator: SvgGenerator = {
  run: generatorRunStub,
} as unknown as SvgGenerator

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
