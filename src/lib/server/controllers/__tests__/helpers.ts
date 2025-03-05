import express from 'express'
import { Readable } from 'node:stream'
import { pino } from 'pino'

import { EntityType } from '@digicatapult/dtdl-parser'
import sinon from 'sinon'
import Database from '../../../db/index.js'
import { ListItem } from '../../models/github.js'
import { Layout } from '../../models/mermaidLayouts.js'
import { type UUID } from '../../models/strings.js'
import { DtdlLoader } from '../../utils/dtdl/dtdlLoader'
import { FuseSearch } from '../../utils/fuseSearch.js'
import { LRUCache } from '../../utils/lruCache.js'
import { generatedSVGFixture, simpleMockDtdlObjectModel } from '../../utils/mermaid/__tests__/fixtures'
import { SvgGenerator } from '../../utils/mermaid/generator.js'
import { SvgMutator } from '../../utils/mermaid/svgMutator.js'
import SessionStore from '../../utils/sessions.js'
import MermaidTemplates from '../../views/components/mermaid'
import OpenOntologyTemplates from '../../views/components/openOntology'
import { complexMockDtdlModel } from './complexDtdlfixture.js'
import { sessionMap } from './sessionFixtures.js'

export const simpleDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed7'
export const complexDtdlId: UUID = 'e89f119a-fc3b-4ce8-8722-2000a7ebeeab'
export const previewDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed8'

const mockModelTable = {
  [simpleDtdlId]: { id: simpleDtdlId, name: 'Simple Model', parsed: simpleMockDtdlObjectModel },
  [complexDtdlId]: { id: complexDtdlId, name: 'Complex Model', parsed: complexMockDtdlModel },
  [previewDtdlId]: { id: previewDtdlId, name: 'Preview Model', parsed: simpleMockDtdlObjectModel, preview: 'Preview' },
}

export const templateMock = {
  MermaidRoot: ({ search, layout }: { search: string; layout: string }) => `root_${layout}_${search}_root`,
  mermaidTarget: ({ generatedOutput, target }: { generatedOutput?: JSX.Element; target: string }): JSX.Element =>
    `mermaidTarget_${generatedOutput}_${target}_mermaidTarget`,
  searchPanel: ({ search, layout, swapOutOfBand }: { search?: string; layout: Layout; swapOutOfBand?: boolean }) =>
    `searchPanel_${search}_${layout}_${swapOutOfBand || false}_searchPanel`,
  navigationPanel: ({ swapOutOfBand, content }: { swapOutOfBand?: boolean; content?: string }) =>
    `navigationPanel_${swapOutOfBand || false}_${content || ''}_navigationPanel`,
  svgControls: ({ generatedOutput }: { generatedOutput?: JSX.Element }): JSX.Element =>
    `svgControls_${generatedOutput}_svgControls`,
} as unknown as MermaidTemplates
export const openOntologyMock = {
  OpenOntologyRoot: ({ populateListLink }: { populateListLink?: string }) => `root_${populateListLink}_root`,
  mainView: (): JSX.Element => `mainView_SomethingHere_mainView`,
  getMenu: ({ showContent }: { showContent: boolean }) => `uploadMethod_${showContent}_uploadMethod`,
  uploadZip: () => `uploadZip_Zip_uploadZip`,
  uploadGithub: (): JSX.Element => `uploadGithub_Github_uploadGithub`,
  githubListItems: ({
    list,
    nextPageLink,
    backLink,
  }: {
    list: ListItem[]
    nextPageLink?: string
    backLink?: string
  }): JSX.Element =>
    `githubListItems_${list.map((item) => `${item.text}_${item.link}`).join('_')}_${nextPageLink}_${backLink}_githubListItems`,
  selectFolder: ({ link, swapOutOfBand }: { link?: string; swapOutOfBand?: boolean }): JSX.Element =>
    `selectFolder_${link}_${swapOutOfBand}_selectFolder`,
} as unknown as OpenOntologyTemplates
export const mockLogger = pino({ level: 'silent' })
export const mockCache = new LRUCache(10, 1000 * 60)

export const mockDb = {
  insert: () => Promise.resolve([{ id: 1 }]),
  get: sinon.stub().callsFake((_, { id }) => {
    return Promise.resolve([mockModelTable[id]])
  }),
} as unknown as Database

export const sessionSetStub = sinon.stub()
export const sessionUpdateStub = sinon.stub()
export const mockSession = {
  get: sinon.stub().callsFake((id) => sessionMap[id]),
  set: sessionSetStub,
  update: sessionUpdateStub,
} as unknown as SessionStore

export const mockSearch = new FuseSearch<EntityType>(Object.values(simpleMockDtdlObjectModel))

export const simpleMockDtdlLoader: DtdlLoader = new DtdlLoader(mockDb, simpleDtdlId)
export const complexMockDtdlLoader: DtdlLoader = new DtdlLoader(mockDb, complexDtdlId)

export const generatorRunStub = sinon.stub().callsFake(() => {
  const mock = {
    type: 'svg',
    content: generatedSVGFixture,
    renderToString: () => mock.content,
    renderForMinimap: () => generatedSVGFixture,
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

export const mockReqWithCookie = (cookie: Record<string, unknown>) => {
  return {
    res: mockRes(),
    signedCookies: cookie,
  } as unknown as express.Request
}

export const mockRes = () => {
  return {
    cookie: sinon.spy(),
    setHeader: sinon.spy(),
    statusCode: 200,
    redirect: sinon.spy(),
  } as unknown as express.Response
}
