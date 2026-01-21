import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import pino, { Logger } from 'pino'
import sinon from 'sinon'
import { ModelDb } from '../../../../db/modelDb.js'
import { InternalError } from '../../../errors.js'
import { UpdateParams } from '../../../models/controllerTypes.js'
import { modelHistoryCookie } from '../../../models/cookieNames.js'
import { MermaidSvgRender, PlainTextRender, renderedDiagramParser } from '../../../models/renderedDiagram/index.js'
import { UUID } from '../../../models/strings.js'
import { allInterfaceFilter } from '../../../utils/dtdl/extract.js'
import { DtdlPath } from '../../../utils/dtdl/parser.js'
import { GithubRequest } from '../../../utils/githubRequest.js'
import { LRUCache } from '../../../utils/lruCache.js'
import { generatedSVGFixture, mockDtdlObjectModel } from '../../../utils/mermaid/__tests__/fixtures.js'
import { SvgGenerator } from '../../../utils/mermaid/generator.js'
import { SvgMutator } from '../../../utils/mermaid/svgMutator.js'
import { PostHogService } from '../../../utils/postHog/postHogService.js'
import ViewStateStore from '../../../utils/viewStates.js'
import OntologyViewTemplates from '../../../views/templates/ontologyView.js'
import { complexMockDtdlModel, simpleMockDtdlObjectModel } from '../../__tests__/fixtures/dtdl.fixtures.js'
import {
  validViewExpanded11Id,
  validViewExpanded12Id,
  validViewExpanded2357Id,
  validViewExpanded235Id,
  validViewExpanded759Id,
  validViewExpanded9XId,
  validViewId,
  validViewSomeOtherSearchId,
  validViewSomeSearchId,
  viewStateMap,
} from '../../__tests__/fixtures/session.fixtures.js'
import { getStub, mockReq, mockReqWithCookie, toHTMLString } from '../../__tests__/helpers.js'
import { OntologyController } from '../index.js'

const simpleDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed7'
const complexDtdlId: UUID = 'e89f119a-fc3b-4ce8-8722-2000a7ebeeab'

const mockModelTable = {
  [simpleDtdlId]: { id: simpleDtdlId, name: 'Simple Model', parsed: simpleMockDtdlObjectModel },
  [complexDtdlId]: { id: complexDtdlId, name: 'Complex Model', parsed: complexMockDtdlModel },
}

export const defaultParams: UpdateParams = {
  viewId: validViewId,
  diagramType: 'flowchart',
  svgWidth: 300,
  svgHeight: 100,
  currentPanX: 0,
  currentPanY: 0,
  currentZoom: 1,
  a11y: ['reduce-motion'],
}

describe('OntologyController', () => {
  let simpleMockModelDb: ModelDb
  let complexMockModelDb: ModelDb
  let templateMock: OntologyViewTemplates
  let mockLogger: Logger
  let mockCache: LRUCache
  let mockSession: ViewStateStore
  let mockMutator: SvgMutator
  let mockGenerator: SvgGenerator
  let mockPostHog: PostHogService
  let mockGithubRequest: GithubRequest
  let controller: OntologyController
  let complexController: OntologyController

  beforeEach(() => {
    simpleMockModelDb = {
      getModelById: (id: UUID) => {
        if (id === 'badId') throw new InternalError(`Failed to find model: ${id}`)
        if (mockModelTable[id]) {
          return Promise.resolve(mockModelTable[id])
        } else {
          return Promise.resolve(null)
        }
      },
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
      getCollection: (dtdlModel: DtdlObjectModel) =>
        Object.entries(dtdlModel)
          .filter(allInterfaceFilter)
          .map(([, entity]) => entity),
      getGithubModelById: (id: UUID) =>
        Promise.resolve({
          id,
          owner: 'owner',
          repo: 'repo',
        }),
      updateModel: () => Promise.resolve(),
    } as unknown as ModelDb

    complexMockModelDb = {
      getModelById: (id: UUID) => {
        if (id === 'badId') throw new InternalError(`Failed to find model: ${id}`)
        if (mockModelTable[id]) {
          return Promise.resolve(mockModelTable[id])
        } else {
          return Promise.resolve(null)
        }
      },
      getDtdlModelAndTree: () => Promise.resolve({ model: complexMockDtdlModel, fileTree: [] }),
      getCollection: (dtdlModel: DtdlObjectModel) =>
        Object.entries(dtdlModel)
          .filter(allInterfaceFilter)
          .map(([, entity]) => entity),
      getGithubModelById: (id: UUID) =>
        Promise.resolve({
          id,
          owner: 'owner',
          repo: 'repo',
        }),
      updateModel: () => Promise.resolve(),
    } as unknown as ModelDb

    templateMock = {
      MermaidRoot: ({
        search,
        canEdit,
        editDisabledReason,
      }: {
        search: string
        canEdit: boolean
        editDisabledReason?: 'errors' | 'permissions'
      }) => `root_${search}_${canEdit}_${editDisabledReason}_root`,
      mermaidTarget: ({ generatedOutput, target }: { generatedOutput?: JSX.Element; target: string }): JSX.Element =>
        `mermaidTarget_${generatedOutput}_${target}_mermaidTarget`,
      searchPanel: ({ search, swapOutOfBand }: { search?: string; swapOutOfBand?: boolean }) =>
        `searchPanel_${search}_${swapOutOfBand || false}_searchPanel`,
      navigationPanel: ({ swapOutOfBand, content }: { swapOutOfBand?: boolean; content?: string }) =>
        `navigationPanel_${swapOutOfBand || false}_${content || ''}_navigationPanel`,
      svgControls: ({ generatedOutput }: { generatedOutput?: JSX.Element }): JSX.Element =>
        `svgControls_${generatedOutput}_svgControls`,
      deleteDialog: () => `deleteDialog_deleteDialog`,
      githubLink: () => `githubLink_githubLink`,
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
      }) =>
        `addNode_${dtdlModelId}_${Object.keys(displayNameIdMap).length}_${folderTree.length}_${swapOutOfBand}_addNode`,
    } as unknown as OntologyViewTemplates

    mockLogger = pino({ level: 'silent' })
    mockCache = new LRUCache(10, 1000 * 60)

    mockSession = {
      get: sinon.stub().callsFake((id) => viewStateMap[id]),
      set: sinon.stub(),
      update: sinon.stub(),
    } as unknown as ViewStateStore

    mockGenerator = {
      run: sinon.stub().callsFake(() => {
        const mock = {
          type: 'svg',
          content: generatedSVGFixture,
          renderToString: () => mock.content,
          renderForMinimap: () => generatedSVGFixture,
        }
        return Promise.resolve(mock)
      }),
    } as unknown as SvgGenerator

    mockMutator = {
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

    mockPostHog = {
      trackUpdateOntologyView: sinon.stub().resolves(),
      trackNodeSelected: sinon.stub().resolves(),
      identifyFromRequest: sinon.stub().resolves(),
      trackModeToggle: sinon.stub().resolves(),
    } as unknown as PostHogService

    mockGithubRequest = {
      getCommit: () => Promise.resolve({ sha: 'currentCommitSha' }),
      getRepoPermissions: () => Promise.resolve('edit'),
    } as unknown as GithubRequest

    controller = new OntologyController(
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
    complexController = new OntologyController(
      complexMockModelDb,
      mockGenerator,
      mockMutator,
      templateMock,
      mockPostHog,
      mockLogger,
      mockCache,
      mockSession,
      mockGithubRequest
    )
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('view', () => {
    it('should return rendered root template', async () => {
      const req = mockReqWithCookie({})
      const result = await controller
        .view(simpleDtdlId, { ...defaultParams }, req)
        .then((value) => (value ? toHTMLString(value) : ''))
      expect(result).to.equal(`root_undefined_false_permissions_root`)
    })

    it('should set a cookie with model history', async () => {
      const req = mockReqWithCookie({})

      await controller.view(simpleDtdlId, { ...defaultParams }, req)

      if (req.res) {
        const cookieStub = getStub(req.res, 'cookie')
        expect(cookieStub.calledOnce).to.equal(true)
        const [cookieName, cookieValue] = cookieStub.firstCall.args
        expect(cookieName).to.equal(modelHistoryCookie)
        expect(cookieValue).to.be.an('array')
        expect(cookieValue[0]).to.have.keys(['id', 'timestamp'])
      } else {
        throw new Error('Response object is undefined')
      }
    })
  })

  describe('updateLayout', () => {
    it('should return templated mermaidMarkdown and searchPanel', async () => {
      const req = mockReq({})
      const result = await controller.updateLayout(req, simpleDtdlId, defaultParams).then(toHTMLString)
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output-message_mermaidTarget`,
          `searchPanel_undefined_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    it('should return templated mermaidMarkdown and searchPanel filtered', async () => {
      const req = mockReq({})
      const result = await controller
        .updateLayout(req, simpleDtdlId, { ...defaultParams, search: 'example 1' })
        .then(toHTMLString)
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output-message_mermaidTarget`,
          `searchPanel_example 1_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    it('should render plain text content', async () => {
      const req = mockReq({})
      mockCache.set(`diagramType=flowchart&dtdlId=${simpleDtdlId}&layout=elk`, {
        type: 'text',
        content: 'None',
      })

      const result = await controller
        .updateLayout(req, simpleDtdlId, {
          ...defaultParams,
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_None_mermaid-output-message_mermaidTarget`,
          `searchPanel_undefined_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls__svgControls`,
        ].join('')
      )
    })

    it('should set HX-Push-Url header if hx-current-url is passed', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path?param1=x&param2=y',
      })
      await controller.updateLayout(req, simpleDtdlId, defaultParams).then(toHTMLString)

      expect(stub.callCount).to.equal(3)
      expect(stub.firstCall.args).to.deep.equal(['HX-Push-Url', '/some/path?param1=x&param2=y&diagramType=flowchart'])
      expect(stub.secondCall.args).to.deep.equal(['Cache-Control', 'no-store'])
      expect(stub.thirdCall.args).to.deep.equal(['Content-Type', 'text/html'])
    })

    it('should overwrite layout in HX-Push-Url header', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path?param1=x',
      })
      await controller.updateLayout(req, simpleDtdlId, defaultParams).then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal(['HX-Push-Url', '/some/path?param1=x&diagramType=flowchart'])
    })

    it('should not set HX-Push-Url header if hx-current-url is not passed', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({})
      await controller.updateLayout(req, simpleDtdlId, defaultParams).then(toHTMLString)

      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args).to.deep.equal(['Cache-Control', 'no-store'])
      expect(stub.secondCall.args).to.deep.equal(['Content-Type', 'text/html'])
    })

    it('should update the stored session', async () => {
      const sessionSetStub = getStub(mockSession, 'set')
      const initCallCount = sessionSetStub.callCount

      const req = mockReq({})
      await controller.updateLayout(req, simpleDtdlId, {
        ...defaultParams,
        search: '"example 1"',
        highlightNodeId: 'dtmi:com:example;1',
      })

      expect(sessionSetStub.callCount).lessThanOrEqual(initCallCount + 1)
      expect(sessionSetStub.lastCall.args[0]).to.equal(validViewId)
      expect(sessionSetStub.lastCall.args[1]).to.deep.equal({
        diagramType: 'flowchart',
        expandedIds: [],
        layout: 'elk',
        search: '"example 1"',
        highlightNodeId: 'dtmi:com:example;1',
      })
    })

    it('should remove duplicate expandedIds', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await controller
        .updateLayout(req, simpleDtdlId, { ...defaultParams, viewId: validViewExpanded11Id })
        .then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal(['HX-Push-Url', '/some/path?diagramType=flowchart'])
    })

    it('should append multiple expandedIds', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await controller
        .updateLayout(req, simpleDtdlId, { ...defaultParams, viewId: validViewExpanded12Id })
        .then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal(['HX-Push-Url', '/some/path?diagramType=flowchart'])
    })

    it('should cache generated output - keyed by params', async () => {
      const req = mockReq({})
      const generatorRunStub = getStub(mockGenerator, 'run')
      const generatorRunCount = generatorRunStub.callCount
      await controller.updateLayout(req, simpleDtdlId, defaultParams)
      const fromCache = mockCache.get(`diagramType=flowchart&dtdlId=${simpleDtdlId}&layout=elk`, renderedDiagramParser)
      expect(fromCache).instanceOf(MermaidSvgRender)
      expect(fromCache?.renderToString()).to.deep.equal(generatedSVGFixture)

      await controller.updateLayout(req, simpleDtdlId, defaultParams)
      expect(generatorRunStub.callCount).to.equal(generatorRunCount + 1)
    })

    it('should ignore lastSearch param when caching', async () => {
      const req = mockReq({})
      await controller.updateLayout(req, simpleDtdlId, { ...defaultParams, viewId: validViewSomeSearchId })
      await controller.updateLayout(req, simpleDtdlId, { ...defaultParams, viewId: validViewSomeOtherSearchId })

      expect(mockCache.size()).to.equal(1)

      const fromCache = mockCache.get(`diagramType=flowchart&dtdlId=${simpleDtdlId}&layout=elk`, renderedDiagramParser)
      expect(fromCache).instanceOf(MermaidSvgRender)
      expect(fromCache?.renderToString()).to.deep.equal(generatedSVGFixture)
    })

    it('should truncate the last expandedId', async () => {
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, complexDtdlId, {
        ...defaultParams,
        shouldTruncate: true,
        highlightNodeId: '5',
        viewId: validViewExpanded235Id,
      })
      const session = getStub(mockSession, 'set').lastCall.args[1]
      expect(session.expandedIds).to.deep.equal(['2', '3'])
    })

    it('should truncate no expanded Id', async () => {
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, complexDtdlId, {
        ...defaultParams,
        shouldTruncate: true,
        highlightNodeId: '1',
        viewId: validViewExpanded235Id,
      })

      const session = getStub(mockSession, 'set').lastCall.args[1]
      expect(session.expandedIds).to.deep.equal(['2', '3', '5'])
    })

    it('should truncate id 2 and 5 and leave 3 expanded', async () => {
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, complexDtdlId, {
        ...defaultParams,
        shouldTruncate: true,
        highlightNodeId: '2',
        viewId: validViewExpanded235Id,
      })

      const session = getStub(mockSession, 'set').lastCall.args[1]
      expect(session.expandedIds).to.deep.equal(['3'])
    })

    it('should truncate id 3 and 7', async () => {
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, complexDtdlId, {
        ...defaultParams,
        shouldTruncate: true,
        highlightNodeId: '3',
        viewId: validViewExpanded2357Id,
      })
      const session = getStub(mockSession, 'set').lastCall.args[1]
      expect(session.expandedIds).to.deep.equal(['2', '5'])
    })

    it('should only truncate nodes that were brought into scope by expansion of highlightNodeId', async () => {
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, complexDtdlId, {
        ...defaultParams,
        shouldTruncate: true,
        highlightNodeId: '5',
        viewId: validViewExpanded759Id,
      })

      const session = getStub(mockSession, 'set').lastCall.args[1]
      expect(session.expandedIds).to.deep.equal(['7', '9'])
    })

    it('should truncate extended relationships', async () => {
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, complexDtdlId, {
        ...defaultParams,
        shouldTruncate: true,
        highlightNodeId: '9',
        viewId: validViewExpanded9XId,
      })

      const session = getStub(mockSession, 'set').lastCall.args[1]
      expect(session.expandedIds).to.deep.equal([])
    })

    it('should animate if svgs are compatible', async () => {
      const req = mockReq({})
      // run with default params to setup the cache
      await controller.updateLayout(req, simpleDtdlId, defaultParams)

      const result = await controller
        .updateLayout(req, simpleDtdlId, {
          ...defaultParams,
          search: 'example',
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_animate_mermaid-output-message_mermaidTarget`,
          `searchPanel_example_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    it('should not animate if cache is empty', async () => {
      const req = mockReq({})

      const result = await controller
        .updateLayout(req, simpleDtdlId, {
          ...defaultParams,
          search: 'example',
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output-message_mermaidTarget`,
          `searchPanel_example_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    it('should not animate if diagram type changes', async () => {
      const req = mockReq({})
      // run with default params to setup the cache
      await controller.updateLayout(req, simpleDtdlId, { ...defaultParams, diagramType: 'classDiagram' })

      const result = await controller
        .updateLayout(req, simpleDtdlId, {
          ...defaultParams,
          search: 'example',
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output-message_mermaidTarget`,
          `searchPanel_example_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    it('should not animate if only highlighted node changes', async () => {
      const req = mockReq({})
      mockCache.set('diagramType=flowchart', new MermaidSvgRender(Buffer.from(generatedSVGFixture)))

      const result = await controller
        .updateLayout(req, simpleDtdlId, {
          ...defaultParams,
          highlightNodeId: 'example',
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output-message_mermaidTarget`,
          `searchPanel_undefined_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    it('should not animate if old output was plain text', async () => {
      const req = mockReq({})
      mockCache.set('diagramType=flowchart', new PlainTextRender('None'))

      const result = await controller
        .updateLayout(req, simpleDtdlId, {
          ...defaultParams,
          search: 'example',
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output-message_mermaidTarget`,
          `searchPanel_example_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })
  })

  describe('editModel', () => {
    it('should return rendered navigation panel template', async () => {
      const req = mockReq({})
      const mockHtmlOutput = [`navigationPanel_false__navigationPanel`, `githubLink_githubLink`].join('')
      const result = await controller.editModel(req, simpleDtdlId, validViewId, true).then(toHTMLString)

      expect(result).to.equal(mockHtmlOutput)
    })

    it('should throw UnauthorisedError when file tree has errors', async () => {
      const mockModelDbWithErrors = {
        ...simpleMockModelDb,
        getDtdlModelAndTree: () =>
          Promise.resolve({
            model: simpleMockDtdlObjectModel,
            fileTree: [
              {
                name: 'test.json',
                type: 'file' as const,
                path: 'test.json',
                entries: [],
                errors: [
                  {
                    ExceptionKind: 'Parsing' as const,
                    Errors: [
                      {
                        Cause: 'Test error',
                        Action: 'Fix it',
                        ValidationID: 'test',
                      },
                    ],
                  },
                ],
              },
            ],
          }),
      } as unknown as ModelDb

      const controllerWithErrors = new OntologyController(
        mockModelDbWithErrors,
        mockGenerator,
        mockMutator,
        templateMock,
        mockPostHog,
        mockLogger,
        mockCache,
        mockSession,
        mockGithubRequest
      )

      const req = mockReq({})
      await expect(controllerWithErrors.editModel(req, simpleDtdlId, validViewId, true)).to.be.rejectedWith(
        'Cannot edit ontology with errors. Please fix all errors before editing.'
      )
    })

    it('should throw UnauthorisedError when nested file tree has errors', async () => {
      const mockModelDbNestedErrors = {
        ...simpleMockModelDb,
        getDtdlModelAndTree: () =>
          Promise.resolve({
            model: simpleMockDtdlObjectModel,
            fileTree: [
              {
                name: 'folder',
                type: 'directory' as const,
                path: 'folder',
                entries: [
                  {
                    name: 'nested.json',
                    type: 'file' as const,
                    path: 'folder/nested.json',
                    entries: [],
                    errors: [
                      {
                        ExceptionKind: 'Resolution' as const,
                        UndefinedIdentifiers: ['dtmi:example:Missing;1'],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
      } as unknown as ModelDb

      const controllerNestedErrors = new OntologyController(
        mockModelDbNestedErrors,
        mockGenerator,
        mockMutator,
        templateMock,
        mockPostHog,
        mockLogger,
        mockCache,
        mockSession,
        mockGithubRequest
      )

      const req = mockReq({})
      await expect(controllerNestedErrors.editModel(req, simpleDtdlId, validViewId, true)).to.be.rejectedWith(
        'Cannot edit ontology with errors. Please fix all errors before editing.'
      )
    })

    it('should allow edit mode when file tree has no errors', async () => {
      const mockModelDbNoErrors = {
        ...simpleMockModelDb,
        getDtdlModelAndTree: () =>
          Promise.resolve({
            model: simpleMockDtdlObjectModel,
            fileTree: [
              {
                name: 'test.json',
                type: 'file' as const,
                path: 'test.json',
                entries: [],
              },
            ],
          }),
      } as unknown as ModelDb

      const controllerNoErrors = new OntologyController(
        mockModelDbNoErrors,
        mockGenerator,
        mockMutator,
        templateMock,
        mockPostHog,
        mockLogger,
        mockCache,
        mockSession,
        mockGithubRequest
      )

      const req = mockReq({})
      const result = await controllerNoErrors.editModel(req, simpleDtdlId, validViewId, true).then(toHTMLString)

      expect(result).to.equal([`navigationPanel_false__navigationPanel`, `githubLink_githubLink`].join(''))
    })
  })

  describe('view - edit permission with errors', () => {
    afterEach(() => sinon.restore())

    it('should disable edit mode when file tree has errors', async () => {
      const mockModelDbWithErrors = {
        ...simpleMockModelDb,
        getModelById: () => Promise.resolve({ source: 'local', owner: null, repo: null }),
        getDtdlModelAndTree: () =>
          Promise.resolve({
            model: simpleMockDtdlObjectModel,
            fileTree: [
              {
                name: 'test.json',
                type: 'file' as const,
                path: 'test.json',
                entries: [],
                errors: [
                  {
                    ExceptionKind: 'Parsing' as const,
                    Errors: [
                      {
                        Cause: 'Test error',
                        Action: 'Fix it',
                        ValidationID: 'test',
                      },
                    ],
                  },
                ],
              },
            ],
          }),
      } as unknown as ModelDb

      const controllerWithErrors = new OntologyController(
        mockModelDbWithErrors,
        mockGenerator,
        mockMutator,
        templateMock,
        mockPostHog,
        mockLogger,
        mockCache,
        mockSession,
        mockGithubRequest
      )

      const req = mockReqWithCookie({})
      const result = await controllerWithErrors
        .view(simpleDtdlId, { ...defaultParams }, req)
        .then((value) => (value ? toHTMLString(value) : ''))

      // Check that the template was called with  canEdit=false and editDisabledReason='errors'
      expect(result).to.equal(`root_undefined_false_errors_root`)
    })

    it('should enable edit mode when file tree has no errors and permission is edit', async () => {
      const mockModelDbNoErrors = {
        ...simpleMockModelDb,
        getModelById: () => Promise.resolve({ source: 'github', owner: 'test-owner', repo: 'test-repo' }),
        getDtdlModelAndTree: () =>
          Promise.resolve({
            model: simpleMockDtdlObjectModel,
            fileTree: [
              {
                name: 'test.json',
                type: 'file' as const,
                path: 'test.json',
                entries: [],
              },
            ],
          }),
      } as unknown as ModelDb

      sinon.stub(mockGithubRequest, 'getRepoPermissions').resolves('edit' as const)

      const controllerNoErrors = new OntologyController(
        mockModelDbNoErrors,
        mockGenerator,
        mockMutator,
        templateMock,
        mockPostHog,
        mockLogger,
        mockCache,
        mockSession,
        mockGithubRequest
      )

      const req = mockReqWithCookie({ OCTOKIT_TOKEN: 'token' })
      const result = await controllerNoErrors
        .view(simpleDtdlId, { ...defaultParams }, req)
        .then((value) => (value ? toHTMLString(value) : ''))

      expect(result).to.equal(`root_undefined_true_undefined_root`)
    })

    it('should disable edit when errors exist in nested directories', async () => {
      const mockModelDbNestedErrors = {
        ...simpleMockModelDb,
        getModelById: () => Promise.resolve({ source: 'local', owner: null, repo: null }),
        getDtdlModelAndTree: () =>
          Promise.resolve({
            model: simpleMockDtdlObjectModel,
            fileTree: [
              {
                name: 'folder',
                type: 'directory' as const,
                path: 'folder',
                entries: [
                  {
                    name: 'nested.json',
                    type: 'file' as const,
                    path: 'folder/nested.json',
                    entries: [],
                    errors: [
                      {
                        ExceptionKind: 'Resolution' as const,
                        UndefinedIdentifiers: ['dtmi:example:Missing;1'],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
      } as unknown as ModelDb

      const controllerNestedErrors = new OntologyController(
        mockModelDbNestedErrors,
        mockGenerator,
        mockMutator,
        templateMock,
        mockPostHog,
        mockLogger,
        mockCache,
        mockSession,
        mockGithubRequest
      )

      const req = mockReqWithCookie({})
      const result = await controllerNestedErrors
        .view(simpleDtdlId, { ...defaultParams }, req)
        .then((value) => (value ? toHTMLString(value) : ''))

      expect(result).to.equal(`root_undefined_false_errors_root`)
    })

    it('should set editDisabledReason to permissions when user lacks edit permission', async () => {
      const mockModelDbGithub = {
        ...simpleMockModelDb,
        getModelById: () => Promise.resolve({ source: 'github', owner: 'owner', repo: 'repo' }),
        getDtdlModelAndTree: () =>
          Promise.resolve({
            model: simpleMockDtdlObjectModel,
            fileTree: [],
          }),
      } as unknown as ModelDb

      sinon.stub(mockGithubRequest, 'getRepoPermissions').resolves('view' as const)

      const controllerGithub = new OntologyController(
        mockModelDbGithub,
        mockGenerator,
        mockMutator,
        templateMock,
        mockPostHog,
        mockLogger,
        mockCache,
        mockSession,
        mockGithubRequest
      )

      const req = mockReqWithCookie({ OCTOKIT_TOKEN: 'token' })
      const result = await controllerGithub
        .view(simpleDtdlId, { ...defaultParams }, req)
        .then((value) => (value ? toHTMLString(value) : ''))

      expect(result).to.equal(`root_undefined_false_permissions_root`)
    })
  })
})
