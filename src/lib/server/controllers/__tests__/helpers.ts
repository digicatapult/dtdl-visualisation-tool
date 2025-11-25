import express from 'express'
import { Readable } from 'node:stream'
import { pino } from 'pino'

import { DtdlObjectModel, EntityType } from '@digicatapult/dtdl-parser'
import sinon from 'sinon'
import Database from '../../../db/index.js'
import { ModelDb } from '../../../db/modelDb.js'
import { InternalError } from '../../errors.js'
import { ListItem } from '../../models/github.js'
import { DtdlId, type UUID } from '../../models/strings.js'
import { allInterfaceFilter } from '../../utils/dtdl/extract.js'
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
import OpenOntologyTemplates from '../../views/components/openOntology'
import { complexMockDtdlModel } from './complexDtdlfixture.js'
import { sessionMap } from './sessionFixtures.js'

export const simpleDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed7'
export const complexDtdlId: UUID = 'e89f119a-fc3b-4ce8-8722-2000a7ebeeab'
export const previewDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed8'
export const defaultDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed9'
export const simpleDtdlRowId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed6'
export const arrayDtdlRowId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed5'
export const githubDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed4'

const mockModelTable = {
  [simpleDtdlId]: { id: simpleDtdlId, name: 'Simple Model', parsed: simpleMockDtdlObjectModel },
  [complexDtdlId]: { id: complexDtdlId, name: 'Complex Model', parsed: complexMockDtdlModel },
  [previewDtdlId]: { id: previewDtdlId, name: 'Preview Model', parsed: simpleMockDtdlObjectModel, preview: 'Preview' },
  [defaultDtdlId]: {
    id: defaultDtdlId,
    name: 'Default Model',
    parsed: simpleMockDtdlObjectModel,
    preview: 'Preview',
    source: 'default',
  },
  [githubDtdlId]: {
    id: githubDtdlId,
    name: 'GitHub Model',
    parsed: simpleMockDtdlObjectModel,
    owner: 'user1',
    repo: 'repo1',
  },
}

export const simpleDtdlFileEntityId = 'dtmi:com:one;1'
export const propertyName = 'someProperty'
export const otherPropertyName = 'someOtherProperty'
export const relationshipName = 'someRelationship'
export const otherRelationshipName = 'someOtherRelationship'
export const telemetryName = 'someTelemetry'
export const otherTelemetryName = 'someOtherTelemetry'
export const commandName = 'someCommand'
export const otherCommandName = 'someOtherCommand'

export const dtdlFileFixture =
  (id: string) =>
  ({
    interfaceUpdate,
    relationshipUpdate,
    propertyUpdate,
    telemetryUpdate,
    commandUpdate,
    commandRequestUpdate,
    commandResponseUpdate,
  }: {
    interfaceUpdate?: Record<string, string>
    relationshipUpdate?: Record<string, string>
    propertyUpdate?: Record<string, string | boolean>
    telemetryUpdate?: Record<string, string>
    commandUpdate?: Record<string, string>
    commandRequestUpdate?: Record<string, string>
    commandResponseUpdate?: Record<string, string>
  }) => ({
    '@context': ['dtmi:dtdl:context;4'],
    '@id': id,
    '@type': 'Interface' as const,
    displayName: 'displayName',
    description: 'description',
    comment: 'comment',
    contents: [
      {
        '@type': 'Property',
        name: propertyName,
        description: 'description',
        comment: 'comment',
        schema: 'double',
        writable: true,
        ...propertyUpdate,
      },
      {
        '@type': 'Property',
        name: otherPropertyName,
      },
      {
        '@type': 'Relationship',
        name: relationshipName,
        comment: 'comment',
        displayName: 'displayName',
        description: 'description',
        ...relationshipUpdate,
      },
      {
        '@type': 'Relationship',
        name: otherRelationshipName,
      },
      {
        '@type': 'Telemetry',
        name: telemetryName,
        schema: 'double',
        comment: 'comment',
        description: 'description',
        displayName: 'displayName',
        ...telemetryUpdate,
      },
      {
        '@type': 'Telemetry',
        name: otherTelemetryName,
        schema: 'string',
      },
      {
        '@type': 'Command',
        name: commandName,
        displayName: 'displayName',
        comment: 'comment',
        description: 'description',
        request: {
          name: 'mode',
          displayName: 'displayName',
          description: 'description',
          comment: 'comment',
          schema: 'string',
          ...(commandRequestUpdate && {
            displayName: commandRequestUpdate.displayName ?? 'displayName',
            description: commandRequestUpdate.description ?? 'description',
            comment: commandRequestUpdate.comment || 'comment',
            schema: commandRequestUpdate.schema || 'string',
          }),
        },
        response: {
          name: 'result',
          displayName: 'displayName',
          description: 'description',
          comment: 'comment',
          schema: 'string',
          ...(commandResponseUpdate && {
            displayName: commandResponseUpdate.displayName ?? 'displayName',
            description: commandResponseUpdate.description ?? 'description',
            comment: commandResponseUpdate.comment || 'comment',
            schema: commandResponseUpdate.schema || 'string',
          }),
        },
        ...commandUpdate,
      },
      {
        '@type': 'Command',
        name: otherCommandName,
        displayName: 'otherDisplayName',
        comment: 'otherComment',
        description: 'otherDescription',
      },
    ],
    ...interfaceUpdate,
  })

export const simpleDtdlFileFixture = dtdlFileFixture(simpleDtdlFileEntityId)

export const arrayDtdlFileEntityId = 'dtmi:com:array;1'
export const arrayDtdlFileFixture = (updates: {
  interfaceUpdate?: Record<string, string>
  relationshipUpdate?: Record<string, string>
  propertyUpdate?: Record<string, string | boolean>
  telemetryUpdate?: Record<string, string>
  commandUpdate?: Record<string, string>
  commandRequestUpdate?: Record<string, string>
  commandResponseUpdate?: Record<string, string>
}) => [simpleDtdlFileFixture({}), dtdlFileFixture(arrayDtdlFileEntityId)(updates)]

const mockDtdlTable = [
  {
    id: simpleDtdlRowId,
    model_id: simpleDtdlId,
    path: 'path',
    source: simpleDtdlFileFixture({}),
  },
  {
    id: simpleDtdlRowId,
    model_id: simpleDtdlId,
    path: 'path',
    source: arrayDtdlFileFixture({}),
  },
  {
    id: arrayDtdlRowId,
    model_id: githubDtdlId,
    path: 'path',
    source: [dtdlFileFixture('dtmi:com:partial;1')({}), dtdlFileFixture('dtmi:com:example;1')({})],
  },
  {
    id: simpleDtdlRowId,
    model_id: githubDtdlId,
    path: 'path',
    source: dtdlFileFixture('dtmi:com:example_extended;1')({}),
  },
]

export const templateMock = {
  MermaidRoot: ({ search }: { search: string }) => `root_${search}_root`,
  mermaidTarget: ({ generatedOutput, target }: { generatedOutput?: JSX.Element; target: string }): JSX.Element =>
    `mermaidTarget_${generatedOutput}_${target}_mermaidTarget`,
  searchPanel: ({ search, swapOutOfBand }: { search?: string; swapOutOfBand?: boolean }) =>
    `searchPanel_${search}_${swapOutOfBand || false}_searchPanel`,
  navigationPanel: ({ swapOutOfBand, content }: { swapOutOfBand?: boolean; content?: string }) =>
    `navigationPanel_${swapOutOfBand || false}_${content || ''}_navigationPanel`,
  svgControls: ({ generatedOutput }: { generatedOutput?: JSX.Element }): JSX.Element =>
    `svgControls_${generatedOutput}_svgControls`,
  deleteDialog: () => `deleteDialog_deleteDialog`,
} as unknown as MermaidTemplates
export const openOntologyMock = {
  OpenOntologyRoot: ({
    populateViewListLink,
    populateEditListLink,
  }: {
    populateViewListLink?: string
    populateEditListLink?: string
  }) => `root_${populateViewListLink}_${populateEditListLink}_root`,
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
  githubPathLabel: ({ path }: { path: string }): JSX.Element => `githubPathLabel_${path}_githubPathLabel`,
  selectFolder: ({
    link,
    swapOutOfBand,
    stage,
  }: {
    link?: string
    swapOutOfBand?: boolean
    stage: string
  }): JSX.Element => `selectFolder_${link}_${swapOutOfBand}_${stage}_selectFolder`,
} as unknown as OpenOntologyTemplates
export const mockLogger = pino({ level: 'silent' })
export const mockCache = new LRUCache(10, 1000 * 60)

export const mockDb = {
  insert: () => Promise.resolve([{ id: 1 }]),
  get: sinon.stub().callsFake((_, { id }) => {
    return Promise.resolve([mockModelTable[id]])
  }),
} as unknown as Database

export const updateDtdlSourceStub = sinon.stub().resolves()
export const deleteOrUpdateDtdlSourceStub = sinon.stub().resolves()
export const simpleMockModelDb = {
  getModelById: (id: UUID) => {
    if (id === 'badId') throw new InternalError(`Failed to find model: ${id}`)
    if (mockModelTable[id]) {
      return Promise.resolve(mockModelTable[id])
    } else {
      return Promise.resolve(null)
    }
  },
  getDtdlSourceByInterfaceId: (_modelId: UUID, interfaceId: DtdlId) => {
    return Promise.resolve(
      mockDtdlTable.find((dtdl) => {
        if (dtdl.source['@id'] === interfaceId) {
          return true
        }
        if (Array.isArray(dtdl.source)) {
          return dtdl.source.some((sourceItem) => sourceItem['@id'] === interfaceId)
        }
        return false
      })
    )
  },
  parseWithUpdatedFiles: () => Promise.resolve(),
  updateDtdlSource: updateDtdlSourceStub,
  deleteOrUpdateDtdlSource: deleteOrUpdateDtdlSourceStub,
  getDefaultModel: () => Promise.resolve(mockModelTable[defaultDtdlId]),
  insertModel: () => Promise.resolve(1),
  deleteDefaultModel: () => Promise.resolve(mockModelTable[defaultDtdlId]),
  getDtdlModelAndTree: () => Promise.resolve({ model: mockDtdlObjectModel, fileTree: [] }),
  getCollection: (dtdlModel: DtdlObjectModel) =>
    Object.entries(dtdlModel)
      .filter(allInterfaceFilter)
      .map(([, entity]) => entity),
} as unknown as ModelDb

export const complexMockModelDb = {
  getModelById: (id: UUID) => {
    if (id === 'badId') throw new InternalError(`Failed to find model: ${id}`)
    if (mockModelTable[id]) {
      return Promise.resolve(mockModelTable[id])
    } else {
      return Promise.resolve(null)
    }
  },
  getDefaultModel: () => Promise.resolve(mockModelTable[defaultDtdlId]),
  insertModel: () => Promise.resolve(1),
  deleteDefaultModel: () => Promise.resolve(mockModelTable[defaultDtdlId]),
  getDtdlModelAndTree: () => Promise.resolve({ model: complexMockDtdlModel, fileTree: [] }),
  getCollection: (dtdlModel: DtdlObjectModel) =>
    Object.entries(dtdlModel)
      .filter(allInterfaceFilter)
      .map(([, entity]) => entity),
} as unknown as ModelDb

export const sessionSetStub = sinon.stub()
export const sessionUpdateStub = sinon.stub()
export const mockSession = {
  get: sinon.stub().callsFake((id) => sessionMap[id]),
  set: sessionSetStub,
  update: sessionUpdateStub,
} as unknown as SessionStore

export const mockSearch = new FuseSearch<EntityType>(Object.values(simpleMockDtdlObjectModel))

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
    res: {
      cookie: sinon.spy(),
      setHeader: sinon.spy(),
      statusCode: 200,
      sendStatus: sinon.spy(),
    },
    signedCookies: cookie,
    header: () => '',
  } as unknown as express.Request
}
