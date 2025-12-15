import { expect } from 'chai'
import express from 'express'
import { describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'

import { ModelDb } from '../../../../db/modelDb.js'
import { DataError, GithubReqError } from '../../../errors.js'
import { UpdateParams } from '../../../models/controllerTypes.js'
import { modelHistoryCookie, octokitTokenCookie } from '../../../models/cookieNames.js'
import { MermaidSvgRender, PlainTextRender, renderedDiagramParser } from '../../../models/renderedDiagram/index.js'
import { GithubRequest } from '../../../utils/githubRequest.js'
import { generatedSVGFixture, simpleMockDtdlObjectModel } from '../../../utils/mermaid/__tests__/fixtures.js'
import MermaidTemplates from '../../../views/components/mermaid.js'
import { mockGithubRequest } from '../../__tests__/github.test.js'
import {
  complexDtdlId,
  complexMockModelDb,
  generatorRunStub,
  mockCache,
  mockGenerator,
  mockLogger,
  mockMutator,
  mockPostHog,
  mockReq,
  mockReqWithCookie,
  mockSession,
  sessionSetStub,
  simpleDtdlId,
  simpleMockModelDb,
  templateMock,
  toHTMLString,
} from '../../__tests__/helpers.js'
import {
  validSessionExpanded11Id,
  validSessionExpanded12Id,
  validSessionExpanded2357Id,
  validSessionExpanded235Id,
  validSessionExpanded759Id,
  validSessionExpanded9XId,
  validSessionId,
  validSessionSomeOtherSearchId,
  validSessionSomeSearchId,
} from '../../__tests__/sessionFixtures.js'
import { OntologyController } from '../index.js'

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

describe('OntologyController', async () => {
  afterEach(() => {
    sinon.restore()
    mockCache.clear()
  })

  const controller = new OntologyController(
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
  const complexController = new OntologyController(
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

  describe('view', () => {
    afterEach(() => sinon.restore())

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
        const cookieStub = req.res.cookie as SinonStub
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
      const stub = sessionSetStub
      const initCallCount = stub.callCount

      const req = mockReq({})
      await controller.updateLayout(req, simpleDtdlId, {
        ...defaultParams,
        search: '"example 1"',
        highlightNodeId: 'dtmi:com:example;1',
      })

      expect(stub.callCount).lessThanOrEqual(initCallCount + 1)
      expect(stub.lastCall.args[0]).to.equal(validSessionId)
      expect(stub.lastCall.args[1]).to.deep.equal({
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
        .updateLayout(req, simpleDtdlId, { ...defaultParams, sessionId: validSessionExpanded11Id })
        .then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal(['HX-Push-Url', '/some/path?diagramType=flowchart'])
    })

    it('should append multiple expandedIds', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await controller
        .updateLayout(req, simpleDtdlId, { ...defaultParams, sessionId: validSessionExpanded12Id })
        .then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal(['HX-Push-Url', '/some/path?diagramType=flowchart'])
    })

    it('should cache generated output - keyed by params', async () => {
      const req = mockReq({})
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
      await controller.updateLayout(req, simpleDtdlId, { ...defaultParams, sessionId: validSessionSomeSearchId })
      await controller.updateLayout(req, simpleDtdlId, { ...defaultParams, sessionId: validSessionSomeOtherSearchId })

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
        sessionId: validSessionExpanded235Id,
      })
      const session = sessionSetStub.lastCall.args[1]
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
        sessionId: validSessionExpanded235Id,
      })

      const session = sessionSetStub.lastCall.args[1]
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
        sessionId: validSessionExpanded235Id,
      })

      const session = sessionSetStub.lastCall.args[1]
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
        sessionId: validSessionExpanded2357Id,
      })
      const session = sessionSetStub.lastCall.args[1]
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
        sessionId: validSessionExpanded759Id,
      })

      const session = sessionSetStub.lastCall.args[1]
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
        sessionId: validSessionExpanded9XId,
      })

      const session = sessionSetStub.lastCall.args[1]
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
      const result = await controller.editModel(req, simpleDtdlId, validSessionId, true).then(toHTMLString)

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
      await expect(controllerWithErrors.editModel(req, simpleDtdlId, validSessionId, true)).to.be.rejectedWith(
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
      await expect(controllerNestedErrors.editModel(req, simpleDtdlId, validSessionId, true)).to.be.rejectedWith(
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
      const result = await controllerNoErrors.editModel(req, simpleDtdlId, validSessionId, true).then(toHTMLString)

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

      const getRepoPermissionsStub = sinon.stub(mockGithubRequest, 'getRepoPermissions').resolves('edit' as const)

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

      // GitHub source with 'edit' permission and no errors, so canEdit=true with editDisabledReason=undefined (not included)
      expect(result).to.equal(`root_undefined_true_root`)

      getRepoPermissionsStub.restore()
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

      const getRepoPermissionsStub = sinon.stub(mockGithubRequest, 'getRepoPermissions').resolves('view' as const)

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

      // Verify template was rendered with appropriate permissions
      expect(result).to.equal(`root_undefined_false_permissions_root`)

      // Restore the stub
      getRepoPermissionsStub.restore()
    })
  })

  describe('publishing', () => {
    const mockOntologyId = 'ontologyId'
    const mockOwner = 'owner'
    const mockRepo = 'repo'
    const mockBaseBranch = 'main'
    const mockBranchName = 'feat/new-branch'
    const mockCommitMessage = 'Commit message'
    const mockPrTitle = 'pr title'
    const mockDescription = 'Description of changes'
    const mockToken = 'token'
    const mockTreeSha = 'treeSha'
    const mockCommitSha = 'commitSha'
    const mockPrUrl = 'http://github.com/pr'
    const mockModel = {
      owner: mockOwner,
      repo: mockRepo,
      base_branch: mockBaseBranch,
      commit_hash: mockCommitSha,
    }

    const cookie = { [octokitTokenCookie]: mockToken }

    const mockFiles = [{ path: 'file1.json', source: '{}' }]

    const getDtdlFilesStub = sinon.stub()
    const getGithubModelByIdStub = sinon.stub()
    const updateModelStub = sinon.stub()

    const mockModelDb = {
      getDtdlFiles: getDtdlFilesStub,
      getGithubModelById: getGithubModelByIdStub,
      updateModel: updateModelStub,
    } as unknown as ModelDb

    const getBranchStub = sinon.stub()
    const createBranchStub = sinon.stub()
    const createBlobStub = sinon.stub()
    const createTreeStub = sinon.stub()
    const createCommitStub = sinon.stub()
    const createPullRequestStub = sinon.stub()
    const updateBranchStub = sinon.stub()
    const getCommitStub = sinon.stub()

    const mockGithubRequest = {
      getBranch: getBranchStub,
      createBranch: createBranchStub,
      createBlob: createBlobStub,
      createTree: createTreeStub,
      createCommit: createCommitStub,
      createPullRequest: createPullRequestStub,
      updateBranch: updateBranchStub,
      getCommit: getCommitStub,
    } as unknown as GithubRequest

    const publishDialogStub = sinon.stub().returns('publishDialog_html')
    const githubLinkStub = sinon.stub().returns('githubLink_html')

    const mockTemplates = {
      publishDialog: publishDialogStub,
      githubLink: githubLinkStub,
    } as unknown as MermaidTemplates

    const controller = new OntologyController(
      mockModelDb,
      mockGenerator,
      mockMutator,
      mockTemplates,
      mockPostHog,
      mockLogger,
      mockCache,
      mockSession,
      mockGithubRequest
    )

    beforeEach(() => {
      sinon.restore()
      getBranchStub.reset()
      createBranchStub.reset()
      createBlobStub.reset()
      createTreeStub.reset()
      createCommitStub.reset()
      createPullRequestStub.reset()
      updateBranchStub.reset()
      getGithubModelByIdStub.reset()
      getDtdlFilesStub.reset()
    })

    describe('/dialog', () => {
      it('should return publish dialog', async () => {
        getGithubModelByIdStub.resolves(mockModel)
        getCommitStub.resolves({ sha: mockCommitSha })
        updateModelStub.resolves(mockModel)
        const result = await controller.dialog(mockReqWithCookie({}), mockOntologyId)
        const html = await toHTMLString(result)
        expect(html).to.equal('publishDialog_html')
      })
    })

    describe('/publish', () => {
      it('should throw error if missing GitHub token', async () => {
        const req = mockReqWithCookie({})
        await expect(
          controller.publish(
            req,
            mockOntologyId,
            mockCommitMessage,
            mockPrTitle,
            mockDescription,
            'newBranch',
            mockBranchName
          )
        ).to.be.rejectedWith(GithubReqError, 'Missing GitHub token')
      })

      it('should throw error if publishing to current branch and out of sync', async () => {
        const req = mockReqWithCookie(cookie)
        getGithubModelByIdStub.resolves(mockModel)
        getCommitStub.resolves({ sha: mockCommitSha })
        updateModelStub.resolves({ ...mockModel, is_out_of_sync: true })

        await expect(
          controller.publish(
            req,
            mockOntologyId,
            mockCommitMessage,
            mockPrTitle,
            mockDescription,
            'currentBranch',
            mockBranchName
          )
        ).to.be.rejectedWith(DataError, `ontology is out-of-sync`)
      })

      it('should throw error if base branch not found', async () => {
        const req = mockReqWithCookie(cookie)
        getGithubModelByIdStub.resolves(mockModel)
        getCommitStub.resolves({ sha: mockCommitSha })
        getDtdlFilesStub.resolves(mockFiles)
        getBranchStub.resolves(null)

        await expect(
          controller.publish(
            req,
            mockOntologyId,
            mockCommitMessage,
            mockPrTitle,
            mockDescription,
            'newBranch',
            mockBranchName
          )
        ).to.be.rejectedWith(DataError, `Base branch ${mockBaseBranch} not found`)
      })

      it('should throw error if branch already exists', async () => {
        const req = mockReqWithCookie(cookie)
        getGithubModelByIdStub.resolves(mockModel)
        getCommitStub.resolves({ sha: mockCommitSha })
        getDtdlFilesStub.resolves(mockFiles)
        getBranchStub
          .onFirstCall()
          .resolves({ object: { sha: 'baseSha' } })
          .onSecondCall()
          .resolves({ object: { sha: 'existingSha' } })

        await expect(
          controller.publish(
            req,
            mockOntologyId,
            mockCommitMessage,
            mockPrTitle,
            mockDescription,
            'newBranch',
            mockBranchName
          )
        ).to.be.rejectedWith(DataError, `Branch with name ${mockBranchName} already exists`)
      })

      it('should publish to new branch successfully', async () => {
        const req = mockReqWithCookie(cookie)
        getGithubModelByIdStub.resolves(mockModel)
        getCommitStub.resolves({ sha: mockCommitSha })
        getDtdlFilesStub.resolves(mockFiles)
        getBranchStub
          .onFirstCall()
          .resolves({ object: { sha: 'baseSha' } })
          .onSecondCall()
          .resolves(null) // new branch does not exist
        createBlobStub.resolves({ sha: 'blobSha' })
        createTreeStub.resolves({ sha: mockTreeSha })
        createCommitStub.resolves({ sha: mockCommitSha })
        createBranchStub.resolves()
        createPullRequestStub.resolves({ html_url: mockPrUrl })

        const result = await controller.publish(
          req,
          mockOntologyId,
          mockCommitMessage,
          mockPrTitle,
          mockDescription,
          'newBranch',
          mockBranchName
        )

        const html = await toHTMLString(result)
        expect(html).to.contain('Published successfully')
        expect(html).to.contain(mockPrUrl)

        expect(createBranchStub.firstCall.args).to.deep.equal([
          mockToken,
          mockOwner,
          mockRepo,
          mockBranchName,
          mockCommitSha,
        ])

        expect(createBlobStub.callCount).to.equal(mockFiles.length)
        expect(createTreeStub.callCount).to.equal(1)
        expect(createCommitStub.callCount).to.equal(1)

        expect(createPullRequestStub.firstCall.args).to.deep.equal([
          mockToken,
          mockOwner,
          mockRepo,
          mockPrTitle,
          mockBranchName,
          mockBaseBranch,
          mockDescription,
        ])
      })

      it('should publish to current branch successfully', async () => {
        const req = mockReqWithCookie(cookie)
        getGithubModelByIdStub.resolves(mockModel)
        getCommitStub.resolves({ sha: mockCommitSha })
        updateModelStub.resolves(mockModel)
        getDtdlFilesStub.resolves(mockFiles)
        updateModelStub.resolves()
        getBranchStub.resolves({ object: { sha: 'baseSha' } })
        createBlobStub.resolves({ sha: 'blobSha' })
        createTreeStub.resolves({ sha: mockTreeSha })
        createCommitStub.resolves({ sha: mockCommitSha })
        updateModelStub.resolves({
          owner: mockOwner,
          repo: mockRepo,
          base_branch: mockBaseBranch,
        })

        const result = await controller.publish(
          req,
          mockOntologyId,
          mockCommitMessage,
          mockPrTitle,
          mockDescription,
          'currentBranch',
          mockBranchName
        )

        const html = await toHTMLString(result)
        expect(html).to.contain(`Published successfully`)
        expect(html).to.contain(`View branch`)

        expect(updateBranchStub.firstCall.args).to.deep.equal([
          mockToken,
          mockOwner,
          mockRepo,
          mockBaseBranch,
          mockCommitSha,
        ])
      })

      it('should revert commit hash if updating branch fails', async () => {
        updateModelStub.reset()
        const req = mockReqWithCookie(cookie)
        getGithubModelByIdStub.resolves(mockModel)
        getCommitStub.resolves({ sha: mockCommitSha })
        updateModelStub.resolves(mockModel)
        getDtdlFilesStub.resolves(mockFiles)
        getBranchStub.resolves({ object: { sha: 'baseSha' } })
        createBlobStub.resolves({ sha: 'blobSha' })
        createTreeStub.resolves({ sha: mockTreeSha })
        const newCommitSha = 'newCommitSha'
        createCommitStub.resolves({ sha: newCommitSha })

        const error = new Error('Update branch failed')
        updateBranchStub.rejects(error)

        await expect(
          controller.publish(
            req,
            mockOntologyId,
            mockCommitMessage,
            mockPrTitle,
            mockDescription,
            'currentBranch',
            mockBranchName
          )
        ).to.be.rejectedWith(error)

        expect(updateModelStub.secondCall.args).to.deep.equal([
          mockOntologyId,
          { is_out_of_sync: false, commit_hash: newCommitSha },
        ])

        expect(updateModelStub.thirdCall.args).to.deep.equal([mockOntologyId, { commit_hash: mockCommitSha }])
      })
    })

    describe('checkRemoteBranch', () => {
      it('should check remote branch and update model to out of sync', async () => {
        const mockRequest = {
          signedCookies: { [octokitTokenCookie]: 'test-token' },
        } as unknown as express.Request

        updateModelStub.resolves(mockModel)
        getGithubModelByIdStub.resolves({
          commit_hash: 'sha-1',
        })
        getCommitStub.resolves({
          sha: 'different-sha',
        })
        const dtdlModelId = 'test-model-id'

        await controller.dialog(mockRequest, dtdlModelId)

        sinon.assert.calledWith(updateModelStub, dtdlModelId, { is_out_of_sync: true })
      })
    })
  })
})
