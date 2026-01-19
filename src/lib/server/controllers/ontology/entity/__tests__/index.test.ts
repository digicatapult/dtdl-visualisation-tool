import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import pino from 'pino'
import sinon from 'sinon'
import { ModelDb } from '../../../../../db/modelDb.js'
import { DataError, InternalError } from '../../../../errors.js'
import { UpdateParams } from '../../../../models/controllerTypes.js'
import { octokitTokenCookie } from '../../../../models/cookieNames.js'
import { DtdlId, DtdlSchema, UUID } from '../../../../models/strings.js'
import { allInterfaceFilter } from '../../../../utils/dtdl/extract.js'
import { DtdlPath } from '../../../../utils/dtdl/parser.js'
import { GithubRequest } from '../../../../utils/githubRequest.js'
import { LRUCache } from '../../../../utils/lruCache.js'
import { generatedSVGFixture, mockDtdlObjectModel } from '../../../../utils/mermaid/__tests__/fixtures.js'
import { SvgGenerator } from '../../../../utils/mermaid/generator.js'
import { SvgMutator } from '../../../../utils/mermaid/svgMutator.js'
import { PostHogService } from '../../../../utils/postHog/postHogService.js'
import SessionStore from '../../../../utils/sessions.js'
import OntologyViewTemplates from '../../../../views/templates/ontologyView.js'
import { simpleMockDtdlObjectModel } from '../../../__tests__/fixtures/dtdl.fixtures.js'
import { sessionMap, validSessionId } from '../../../__tests__/fixtures/session.fixtures.js'
import { dtdlFileFixture, mockReq, mockReqWithCookie, toHTMLString } from '../../../__tests__/helpers.js'
import { OntologyController } from '../../index.js'
import { EntityController } from '../index.js'

chai.use(chaiAsPromised)
const { expect } = chai

const simpleDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed7'
const githubDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed4'
const simpleDtdlRowId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed6'
const arrayDtdlRowId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed5'

const simpleDtdlFileEntityId = 'dtmi:com:one;1'
const arrayDtdlFileEntityId = 'dtmi:com:array;1'
const propertyName = 'someProperty'
const relationshipName = 'someRelationship'
const telemetryName = 'someTelemetry'
const commandName = 'someCommand'

const simpleDtdlFileFixture = dtdlFileFixture(simpleDtdlFileEntityId)
const arrayDtdlFileFixture = (updates: {
  interfaceUpdate?: Record<string, string>
  relationshipUpdate?: Record<string, string>
  propertyUpdate?: Record<string, string | boolean>
  telemetryUpdate?: Record<string, string>
  commandUpdate?: Record<string, string>
  commandRequestUpdate?: Record<string, string>
  commandResponseUpdate?: Record<string, string>
}) => [simpleDtdlFileFixture({}), dtdlFileFixture(arrayDtdlFileEntityId)(updates)]

const mockModelTable = {
  [githubDtdlId]: {
    id: githubDtdlId,
    name: 'GitHub Model',
    parsed: simpleMockDtdlObjectModel,
    owner: 'user1',
    repo: 'repo1',
    source: 'github',
    base_branch: 'main',
    commit_hash: 'commitHash',
    isOutOfSync: false,
  },
}

const mockDtdlTable = [
  {
    id: simpleDtdlRowId,
    model_id: simpleDtdlId,
    path: 'path',
    source: simpleDtdlFileFixture({}),
  },
  {
    id: arrayDtdlRowId,
    model_id: githubDtdlId,
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

const updateDtdlSourceStub = sinon.stub().resolves()
const deleteOrUpdateDtdlSourceStub = sinon.stub().resolves()
const regeneratePreviewStub = sinon.stub().resolves()
const addEntityToModelStub = sinon.stub().resolves()

const simpleMockModelDb = {
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
  updateDtdlSource: updateDtdlSourceStub,
  deleteOrUpdateDtdlSource: deleteOrUpdateDtdlSourceStub,
  regeneratePreview: regeneratePreviewStub,
  parseWithUpdatedFiles: () => Promise.resolve(),
  getDtdlModelAndTree: () =>
    Promise.resolve({
      model: {
        ...mockDtdlObjectModel,
        'dtmi:test:TestNode;1': {
          Id: 'dtmi:test:TestNode;1',
          displayName: 'TestNode',
          EntityKind: 'Interface',
        },
      },
      fileTree: [],
    }),
  addEntityToModel: addEntityToModelStub,
  getCollection: (dtdlModel: DtdlObjectModel) =>
    Object.entries(dtdlModel)
      .filter(allInterfaceFilter)
      .map(([, entity]) => entity),
} as unknown as ModelDb

const templateMock = {
  MermaidRoot: ({
    search,
    canEdit,
    editDisabledReason,
  }: {
    search?: string
    canEdit?: boolean
    editDisabledReason?: 'errors' | 'permissions'
  }) => {
    let result = `root_${search}`
    if (typeof canEdit !== 'undefined') {
      result += `_${canEdit}`
    }
    if (typeof editDisabledReason !== 'undefined') {
      result += `_${editDisabledReason}`
    }
    result += `_root`
    return result
  },
  mermaidTarget: ({ generatedOutput, target }: { generatedOutput?: JSX.Element; target: string }): JSX.Element =>
    `mermaidTarget_${generatedOutput}_${target}_mermaidTarget`,
  searchPanel: ({ search, swapOutOfBand }: { search?: string; swapOutOfBand?: boolean }) =>
    `searchPanel_${search}_${swapOutOfBand || false}_searchPanel`,
  navigationPanel: ({ swapOutOfBand, content }: { swapOutOfBand?: boolean; content?: string }) =>
    `navigationPanel_${swapOutOfBand || false}_${content || ''}_navigationPanel`,
  svgControls: ({ generatedOutput }: { generatedOutput?: JSX.Element }): JSX.Element =>
    `svgControls_${generatedOutput}_svgControls`,
  deleteDialog: () => `deleteDialog_deleteDialog`,
  addNode: ({
    dtdlModelId,
    displayNameIdMap,
    folderTree,
    swapOutOfBand,
  }: {
    dtdlModelId: string
    displayNameIdMap: Record<string, string>
    folderTree: DtdlPath[]
    swapOutOfBand?: boolean
  }) => `addNode_${dtdlModelId}_${Object.keys(displayNameIdMap).length}_${folderTree.length}_${swapOutOfBand}_addNode`,
} as unknown as OntologyViewTemplates

const mockLogger = pino({ level: 'silent' })
const mockCache = new LRUCache(10, 1000 * 60)

const sessionUpdateStub = sinon.stub()
const sessionSetStub = sinon.stub()
const mockSession = {
  get: sinon.stub().callsFake((id) => sessionMap[id]),
  set: sessionSetStub,
  update: sessionUpdateStub,
} as unknown as SessionStore

const generatorRunStub = sinon.stub().callsFake(() => {
  const mock = {
    type: 'svg',
    content: generatedSVGFixture,
    renderToString: () => mock.content,
    renderForMinimap: () => generatedSVGFixture,
  }
  return Promise.resolve(mock)
})

const mockMutator: SvgMutator = {
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

const mockGenerator = {
  run: generatorRunStub,
} as unknown as SvgGenerator

const mockPostHog = {
  trackUpdateOntologyView: sinon.stub().resolves(),
} as unknown as PostHogService

const mockGithubRequest = {} as unknown as GithubRequest

export const defaultParams: UpdateParams = {
  sessionId: validSessionId,
  diagramType: 'flowchart',
  svgWidth: 300,
  svgHeight: 100,
  currentPanX: 0,
  currentPanY: 0,
  currentZoom: 1,
  a11y: ['reduce-motion'],
}

const updateLayoutOutput = [
  `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output-message_mermaidTarget`,
  `searchPanel_undefined_true_searchPanel`,
  `navigationPanel_true__navigationPanel`,
  `svgControls_${generatedSVGFixture}_svgControls`,
].join('')
const newValue = 'updated'

describe('EntityController', async () => {
  const req = mockReqWithCookie({
    [octokitTokenCookie]: 'valid-token',
  })
  afterEach(() => {
    sinon.restore()
    mockCache.clear()
    regeneratePreviewStub.resetHistory()
  })

  const ontologyController = new OntologyController(
    simpleMockModelDb,
    mockGenerator,
    mockMutator,
    templateMock,
    mockPostHog,
    mockLogger,
    mockCache,
    mockSession,
    mockGithubRequest
  )

  const controller = new EntityController(
    simpleMockModelDb,
    ontologyController,
    templateMock,
    mockSession,
    mockCache,
    mockLogger
  )

  describe('putDisplayName', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new display name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ interfaceUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new display name on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ interfaceUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putRelationshipDisplayName', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new relationship display name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship display name on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { displayName: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putDescription', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ interfaceUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ interfaceUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putRelationshipDescription', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new relationship description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { description: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putComment', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new interface comment on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller.putComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody).then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ interfaceUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new interface comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller.putComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody).then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ interfaceUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putRelationshipComment', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new relationship comment name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { comment: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putRelationshipTarget', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new relationship target on non-array DTDL file', async () => {
      const newTarget = 'dtmi:com:new_target;1'
      const putBody = {
        ...defaultParams,
        value: newTarget,
        relationshipName,
      }
      const result = await controller
        .putRelationshipTarget(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { target: newTarget } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship target on array DTDL file', async () => {
      const newTarget = 'dtmi:com:new_target;1'
      const putBody = {
        ...defaultParams,
        value: newTarget,
        relationshipName,
      }
      const result = await controller
        .putRelationshipTarget(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { target: newTarget } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertyDisplayName', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new property display name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property display name on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { displayName: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertyDescription', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new property description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { description: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertyComment', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new property comment name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { comment: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertySchema', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new property schema on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'float' as const,
        propertyName,
      }
      const result = await controller
        .putPropertySchema(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { schema: 'float' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property schema on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'float' as const,
        propertyName,
      }
      const result = await controller
        .putPropertySchema(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { schema: 'float' } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertyWritable', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new property writable on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'false',
        propertyName,
      }
      const result = await controller
        .putPropertyWritable(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { writable: false } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property writable on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'false',
        propertyName,
      }
      const result = await controller
        .putPropertyWritable(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { writable: false } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetryComment', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new telemetry comment on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetrySchema', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new telemetry schema on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'boolean' as DtdlSchema,
        telemetryName,
      }
      const result = await controller
        .putTelemetrySchema(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { schema: 'boolean' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry schema on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'boolean' as DtdlSchema,
        telemetryName,
      }
      const result = await controller
        .putTelemetrySchema(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { schema: 'boolean' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetryDescription', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new telemetry description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetryDisplayName', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new telemetry displayName on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry displayName on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandDisplayName', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command displayName on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ commandUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command displayName on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ commandUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandDescription', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ commandUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ commandUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandComment', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command comment on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ commandUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ commandUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandRequestDisplayName', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command request displayName on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ commandRequestUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command request displayName on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ commandRequestUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandRequestComment', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command request comment on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ commandRequestUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command request comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ commandRequestUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandRequestDescription', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command request description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ commandRequestUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command request description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ commandRequestUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandRequestSchema', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command request schema on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'integer' as DtdlSchema,
        commandName,
      }
      const result = await controller
        .putCommandRequestSchema(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        simpleDtdlFileFixture({ commandRequestUpdate: { schema: 'integer' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command request schema on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'integer' as DtdlSchema,
        commandName,
      }
      const result = await controller
        .putCommandRequestSchema(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(
        arrayDtdlFileFixture({ commandRequestUpdate: { schema: 'integer' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandResponseDisplayName', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command response displayName', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandResponseDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)

      expect(updateDtdlSourceStub.calledOnce).to.be.equal(true)
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandResponseComment', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command response comment', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandResponseComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)

      expect(updateDtdlSourceStub.calledOnce).to.be.equal(true)
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandResponseDescription', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command response description', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandResponseDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)

      expect(updateDtdlSourceStub.calledOnce).to.be.equal(true)
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandResponseSchema', () => {
    afterEach(() => updateDtdlSourceStub.resetHistory())

    it('should update db and layout for new command response schema', async () => {
      const putBody = {
        ...defaultParams,
        value: 'boolean' as DtdlSchema,
        commandName: commandName,
      }
      const result = await controller
        .putCommandResponseSchema(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)

      expect(updateDtdlSourceStub.calledOnce).to.be.equal(true)
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('invalid chars', () => {
    const invalidChars = [`"`, `\\`]
    invalidChars.forEach((char) => {
      const body = {
        ...defaultParams,
        value: char,
        relationshipName: '',
        propertyName: '',
        telemetryName: '',
        commandName: '',
      }
      const routes = [
        () => controller.putDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putTelemetryDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putTelemetryDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putTelemetryComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandRequestDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandRequestDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandRequestComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandResponseDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandResponseDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandResponseComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
      ]
      routes.forEach((fn) => {
        it(`should error on ${char} char in value`, async () => {
          await expect(fn()).to.be.rejectedWith(DataError, 'Invalid JSON')
        })
      })
    })
  })

  describe('deleteDialog', () => {
    it('should return templated delete dialog', async () => {
      const result = await controller.deleteDialog(githubDtdlId, 'dtmi:com:example;1').then(toHTMLString)

      expect(result).to.equal('deleteDialog_deleteDialog')
    })
  })

  describe('deleteInterface', () => {
    afterEach(() => {
      updateDtdlSourceStub.resetHistory()
      deleteOrUpdateDtdlSourceStub.resetHistory()
    })

    it('should delete single interface file - not extended', async () => {
      const result = await controller
        .deleteInterface(req, githubDtdlId, 'dtmi:com:example_extended;1', defaultParams)
        .then(toHTMLString)

      // Wait for fire-and-forget regeneratePreview to be called
      await new Promise((resolve) => setImmediate(resolve))

      expect(deleteOrUpdateDtdlSourceStub.firstCall.args).to.deep.equal([[{ id: simpleDtdlRowId, source: null }]])
      expect(regeneratePreviewStub.calledOnceWith(githubDtdlId)).to.equal(true)

      expect(result).to.equal(updateLayoutOutput)
    })

    it('should delete multiple interfaces - extended', async () => {
      const result = await controller
        .deleteInterface(req, githubDtdlId, 'dtmi:com:example;1', defaultParams)
        .then(toHTMLString)

      // Wait for fire-and-forget regeneratePreview to be called
      await new Promise((resolve) => setImmediate(resolve))

      expect(deleteOrUpdateDtdlSourceStub.firstCall.args).to.deep.equal([
        [
          { id: arrayDtdlRowId, source: [dtdlFileFixture('dtmi:com:partial;1')({})] },
          { id: simpleDtdlRowId, source: null },
        ],
      ])
      expect(regeneratePreviewStub.calledOnceWith(githubDtdlId)).to.equal(true)

      expect(result).to.equal(updateLayoutOutput)
    })

    it('should delete multiple interfaces in same file', async () => {
      await controller.deleteInterfaces(githubDtdlId, ['dtmi:com:example;1', 'dtmi:com:partial;1'])

      expect(deleteOrUpdateDtdlSourceStub.firstCall.args).to.deep.equal([[{ id: arrayDtdlRowId, source: null }]])
    })

    it('should handle circular extended by refs', async () => {
      const model = {
        '1': { EntityKind: 'Interface', extendedBy: ['2'] },
        '2': { EntityKind: 'Interface', extendedBy: ['1'] },
      } as unknown as DtdlObjectModel
      expect(() => controller.getExtendedBy(model, '1')).to.throw(Error, 'Circular reference in extended bys')
    })
  })

  describe('postContent', () => {
    afterEach(() => {
      updateDtdlSourceStub.resetHistory()
    })

    it('should update db and layout to add relationship content and regenerate preview', async () => {
      const newRelationshipName = 'newRelationship'
      const result = await controller
        .postContent(req, githubDtdlId, arrayDtdlFileEntityId, {
          contentName: newRelationshipName,
          contentType: 'Relationship',
          ...defaultParams,
        })
        .then(toHTMLString)

      const updatedSource = updateDtdlSourceStub.firstCall.args[1]
      const targetInterface = Array.isArray(updatedSource) ? updatedSource[1] : updatedSource
      expect(targetInterface.contents.some((c: { name: string }) => c.name === newRelationshipName)).to.equal(true)
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('deleteContent', () => {
    afterEach(() => {
      updateDtdlSourceStub.resetHistory()
    })

    it('should update db and layout to delete content on non-array DTDL file', async () => {
      const result = await controller
        .deleteContent(req, githubDtdlId, simpleDtdlFileEntityId, { contentName: relationshipName, ...defaultParams })
        .then(toHTMLString)

      const file = simpleDtdlFileFixture({})
      const fileWithoutRelationship = {
        ...file,
        contents: file.contents.filter((c) => c.name !== relationshipName),
      }
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal(fileWithoutRelationship)
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout to delete content on array DTDL file', async () => {
      const result = await controller
        .deleteContent(req, githubDtdlId, arrayDtdlFileEntityId, { contentName: relationshipName, ...defaultParams })
        .then(toHTMLString)

      const file = arrayDtdlFileFixture({})[1]
      const fileWithoutRelationship = {
        ...file,
        contents: file.contents.filter((c) => c.name !== relationshipName),
      }
      expect(updateDtdlSourceStub.firstCall.args[1]).to.deep.equal([simpleDtdlFileFixture({}), fileWithoutRelationship])
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('addNewNode', () => {
    it('should return rendered addNode template with folder tree', async () => {
      const res = await controller.addNewNode(simpleDtdlId, defaultParams)
      expect(res).to.not.equal(undefined)
      const result = await toHTMLString(res!)

      expect(result).to.include('addNode')
      expect(result).to.include(simpleDtdlId)
    })

    it('should update session to clear highlightNodeId and search', async () => {
      const initialCallCount = sessionUpdateStub.callCount

      await controller.addNewNode(simpleDtdlId, defaultParams)

      expect(sessionUpdateStub.callCount).to.equal(initialCallCount + 1)
      const [sessionId, updates] = sessionUpdateStub.lastCall.args
      expect(sessionId).to.equal(validSessionId)
      expect(updates).to.deep.equal({
        highlightNodeId: undefined,
        search: undefined,
      })
    })
  })

  describe('createNewNode', () => {
    beforeEach(() => {
      addEntityToModelStub.reset()
      regeneratePreviewStub.resetHistory()
    })

    it('should create new node with valid input', async () => {
      const mockReqObj = mockReq({})
      const body = {
        displayName: 'New Test Node',
        description: 'Test description',
        comment: 'Test comment',
        extends: 'dtmi:com:example;1',
        folderPath: 'test/folder',
        ...defaultParams,
      }

      const result = await controller.createNewNode(simpleDtdlId, body, mockReqObj).then(toHTMLString)

      // Wait for fire-and-forget regeneratePreview to be called
      await new Promise((resolve) => setImmediate(resolve))

      expect(addEntityToModelStub.calledOnce).to.equal(true)
      const [modelId, entityJson, filePath] = addEntityToModelStub.firstCall.args
      expect(modelId).to.equal(simpleDtdlId)
      expect(filePath).to.equal('test/folder/NewTestNode.json')

      const parsedEntity = JSON.parse(entityJson)
      expect(parsedEntity).to.deep.include({
        '@id': 'dtmi:NewTestNode;1',
        '@type': 'Interface',
        '@context': 'dtmi:dtdl:context;4',
        displayName: 'NewTestNode',
        description: 'Test description',
        comment: 'Test comment',
        extends: ['dtmi:com:example;1'],
        contents: [],
      })

      expect(regeneratePreviewStub.calledOnceWith(simpleDtdlId)).to.equal(true)

      expect(result).to.include('mermaidTarget')
      expect(result).to.include('searchPanel')
      expect(result).to.include('navigationPanel')
    })

    it('should create node in root folder when no folderPath provided', async () => {
      const mockReqObj = mockReq({})
      const body = {
        displayName: 'Root Node',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
        ...defaultParams,
      }

      await controller.createNewNode(simpleDtdlId, body, mockReqObj)

      const [, , filePath] = addEntityToModelStub.firstCall.args
      expect(filePath).to.equal('RootNode.json')
    })

    it('should convert displayName to PascalCase', async () => {
      const mockReqObj = mockReq({})
      const body = {
        displayName: 'test node with spaces',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
        ...defaultParams,
      }

      await controller.createNewNode(simpleDtdlId, body, mockReqObj)

      const [, entityJson] = addEntityToModelStub.firstCall.args
      const parsedEntity = JSON.parse(entityJson)
      expect(parsedEntity.displayName).to.equal('TestNodeWithSpaces')
      expect(parsedEntity['@id']).to.equal('dtmi:TestNodeWithSpaces;1')
    })

    it('should handle optional fields correctly', async () => {
      const mockReqObj = mockReq({})
      const body = {
        displayName: 'Minimal Node',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
        ...defaultParams,
      }

      await controller.createNewNode(simpleDtdlId, body, mockReqObj)

      const [, entityJson] = addEntityToModelStub.firstCall.args
      const parsedEntity = JSON.parse(entityJson)
      expect(parsedEntity.description).to.be.equal(undefined)
      expect(parsedEntity.comment).to.equal(undefined)
      expect(parsedEntity.extends).to.deep.equal([])
    })

    it('should throw DataError when generated ID already exists', async () => {
      const mockReqObj = mockReq({})

      const customMockDb = {
        ...simpleMockModelDb,
        getDtdlModelAndTree: () =>
          Promise.resolve({
            model: {
              'dtmi:com:Example1;1': {
                Id: 'dtmi:com:Example1;1',
                displayName: { en: 'Example1' },
                EntityKind: 'Interface' as const,
                extends: [],
                SupplementalTypes: [],
                SupplementalProperties: {},
                UndefinedTypes: [],
                UndefinedProperties: {},
                description: {},
                languageMajorVersion: 2,
                ClassId: 'dtmi:dtdl:class:Interface;2',
                contents: {},
                commands: {},
                components: {},
                properties: {},
                relationships: {},
                telemetries: {},
                extendedBy: [],
                schemas: [],
              },
              // Add a second entity so common prefix calculation works correctly
              'dtmi:com:Other;1': {
                Id: 'dtmi:com:Other;1',
                displayName: { en: 'Other' },
                EntityKind: 'Interface' as const,
                extends: [],
                SupplementalTypes: [],
                SupplementalProperties: {},
                UndefinedTypes: [],
                UndefinedProperties: {},
                description: {},
                languageMajorVersion: 2,
                ClassId: 'dtmi:dtdl:class:Interface;2',
                contents: {},
                commands: {},
                components: {},
                properties: {},
                relationships: {},
                telemetries: {},
                extendedBy: [],
                schemas: [],
              },
            },
            fileTree: [],
          }),
      } as unknown as ModelDb

      const customController = new EntityController(
        customMockDb,
        ontologyController,
        templateMock,
        mockSession,
        mockCache,
        mockLogger
      )

      const body = {
        displayName: 'example 1',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
        ...defaultParams,
      }

      try {
        await customController.createNewNode(simpleDtdlId, body, mockReqObj)
        expect.fail('Expected InternalError to be thrown')
      } catch (error) {
        if (!(error instanceof DataError)) {
          throw error // Re-throw if it's not the expected error type
        }
        expect(error.message).to.include("Please update the display name 'Example1'")
      }

      expect(addEntityToModelStub.called).to.equal(false)
    })

    it('should throw error for empty displayName', async () => {
      const mockReqObj = mockReq({})
      const body = {
        displayName: '',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
        ...defaultParams,
      }

      await expect(controller.createNewNode(simpleDtdlId, body, mockReqObj)).to.be.rejected

      expect(addEntityToModelStub.called).to.equal(false)
    })
  })
})
