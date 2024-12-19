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
import { SvgMutator } from '../../utils/mermaid/svgMutator.js'
import SessionStore from '../../utils/sessions.js'
import MermaidTemplates from '../../views/components/mermaid'
import { complexMockDtdlModel } from './complexDtdlfixture.js'
import { sessionMap } from './sessionFixtures.js'

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

export const sessionSetStub = sinon.stub()
export const mockSession = {
  get: sinon.stub().callsFake((id) => sessionMap[id]),
  set: sessionSetStub,
} as unknown as SessionStore

export const mockDtdlLoader: DtdlLoader = new DtdlLoader(mockDtdlObjectModel)
export const mockSearch = new FuseSearch<EntityType>(Object.values(simpleMockDtdlObjectModel))

export const simpleMockDtdlLoader: DtdlLoader = new DtdlLoader(simpleMockDtdlObjectModel)
export const complexMockDtdlLoader: DtdlLoader = new DtdlLoader(complexMockDtdlModel)

export const generatorRunStub = sinon.stub().callsFake(() => {
  const mock = {
    type: 'svg',
    content: generatedSVGFixture,
    renderToString: () => mock.content,
  }
  return Promise.resolve(mock)
})
// These mocks are pretty horrible. This is because they need to work globally for all tests and
// they need to mutate themselves
export const mockMutator: SvgMutator = {
  setSVGAttributes: sinon.stub().callsFake((x) => {
    x.content = x.renderToString() + '_attr'
    x.renderToString = () => x.content
  }),
  setupAnimations: sinon.stub().callsFake((...args) => {
    const newOutput = args[1]
    newOutput.content = newOutput.renderToString() + '_animate'
    newOutput.renderToString = () => newOutput.content
    return { pan: { x: 100, y: 50 }, zoom: 0.5 }
  }),
} as unknown as SvgMutator
export const mockGenerator = {
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
