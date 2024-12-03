import express from 'express'
import { Readable } from 'node:stream'
import { pino } from 'pino'

import { EntityType } from '@digicatapult/dtdl-parser'
import sinon from 'sinon'
import { Layout } from '../../models/mermaidLayouts.js'
import { DtdlLoader } from '../../utils/dtdl/dtdlLoader'
import { FuseSearch } from '../../utils/fuseSearch.js'
import { LRUCache } from '../../utils/lruCache.js'
import {
  generatedSVGFixture,
  mockDtdlObjectModel,
  simpleMockDtdlObjectModel,
} from '../../utils/mermaid/__tests__/fixtures'
import { SvgGenerator } from '../../utils/mermaid/generator.js'
import MermaidTemplates from '../../views/components/mermaid'
import { complexMockDtdlModel } from './complexDtdlfixture.js'

export const templateMock = {
  MermaidRoot: ({ search, layout }: { search: string; layout: string }) => `root_${layout}_${search}_root`,
  mermaidTarget: ({ generatedOutput, target }: { generatedOutput?: JSX.Element; target: string }): JSX.Element =>
    `mermaidTarget_${generatedOutput}_${target}_mermaidTarget`,
  searchPanel: ({ search, layout, swapOutOfBand }: { search?: string; layout: Layout; swapOutOfBand?: boolean }) =>
    `searchPanel_${search}_${layout}_${swapOutOfBand || false}_searchPanel`,
  navigationPanel: ({ swapOutOfBand, content }: { swapOutOfBand?: boolean; content?: string }) =>
    `navigationPanel_${swapOutOfBand || false}_${content || ''}_navigationPanel`,
} as unknown as MermaidTemplates
export const mockLogger = pino({ level: 'silent' })
export const mockCache = new LRUCache(10, 1000 * 60)

export const mockDtdlLoader: DtdlLoader = new DtdlLoader(mockDtdlObjectModel)
export const mockSearch = new FuseSearch<EntityType>()

export const simpleMockDtdlLoader: DtdlLoader = new DtdlLoader(simpleMockDtdlObjectModel)
export const complexMockDtdlLoader: DtdlLoader = new DtdlLoader(complexMockDtdlModel)

export const generatorRunStub = sinon.stub().resolves(generatedSVGFixture)
export const mockGenerator: SvgGenerator = {
  setSVGAttributes: sinon.stub().callsFake((x) => `${x}_attr`),
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
