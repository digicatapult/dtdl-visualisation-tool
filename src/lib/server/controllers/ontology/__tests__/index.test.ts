import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon, { SinonStub } from 'sinon'
import { InternalError } from '../../../errors.js'
import { UpdateParams } from '../../../models/controllerTypes.js'
import { modelHistoryCookie } from '../../../models/cookieNames.js'
import { MermaidSvgRender, PlainTextRender, renderedDiagramParser } from '../../../models/renderedDiagram/index.js'
import { generatedSVGFixture } from '../../../utils/mermaid/__tests__/fixtures.js'
import { mockGithubRequest } from '../../__tests__/github.test.js'
import {
  addEntityToModelStub,
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
      expect(result).to.equal(`root_undefined_root`)
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

      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args).to.deep.equal(['HX-Push-Url', '/some/path?param1=x&param2=y&diagramType=flowchart'])
      expect(stub.secondCall.args).to.deep.equal(['Content-Type', 'text/html'])
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

      expect(stub.callCount).to.equal(1)
      expect(stub.firstCall.args).to.deep.equal(['Content-Type', 'text/html'])
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
      const mockHtmlOutput = `navigationPanel_false__navigationPanel`
      const result = await controller.editModel(req, simpleDtdlId, validSessionId, true).then(toHTMLString)

      expect(result).to.equal(mockHtmlOutput)
    })
  })

  describe('addNewNode', () => {
    it('should return rendered addNode template with folder tree', async () => {
      const req = mockReq({})
      const result = await controller.addNewNode(simpleDtdlId, defaultParams, req).then(toHTMLString)

      expect(result).to.include('addNode')
      expect(result).to.include(simpleDtdlId)
    })

    it('should update session to reset state for new node creation', async () => {
      const req = mockReq({})
      const initialCallCount = sessionSetStub.callCount

      await controller.addNewNode(simpleDtdlId, defaultParams, req)

      expect(sessionSetStub.callCount).to.equal(initialCallCount + 2)
      const firstCallArgs = sessionSetStub.getCall(initialCallCount).args[1]
      expect(firstCallArgs).to.deep.equal({
        diagramType: 'flowchart',
        layout: 'elk',
        search: undefined,
        expandedIds: [],
        highlightNodeId: undefined,
      })
    })
  })

  describe('createNewNode', () => {
    beforeEach(() => {
      addEntityToModelStub.reset()
    })

    it('should create new node with valid input', async () => {
      const req = mockReq({})
      req.body = {
        displayName: 'New Test Node',
        description: 'Test description',
        comment: 'Test comment',
        extends: 'dtmi:com:example;1',
        folderPath: 'test/folder',
      }

      const result = await controller.createNewNode(simpleDtdlId, req).then(toHTMLString)

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

      expect(result).to.include('navigationPanel')
      expect(result).to.include('mermaidTarget')
    })

    it('should create node in root folder when no folderPath provided', async () => {
      const req = mockReq({})
      req.body = {
        displayName: 'Root Node',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
      }

      await controller.createNewNode(simpleDtdlId, req)

      const [, , filePath] = addEntityToModelStub.firstCall.args
      expect(filePath).to.equal('RootNode.json')
    })

    it('should convert displayName to PascalCase', async () => {
      const req = mockReq({})
      req.body = {
        displayName: 'test node with spaces',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
      }

      await controller.createNewNode(simpleDtdlId, req)

      const [, entityJson] = addEntityToModelStub.firstCall.args
      const parsedEntity = JSON.parse(entityJson)
      expect(parsedEntity.displayName).to.equal('TestNodeWithSpaces')
      expect(parsedEntity['@id']).to.equal('dtmi:TestNodeWithSpaces;1')
    })

    it('should handle optional fields correctly', async () => {
      const req = mockReq({})
      req.body = {
        displayName: 'Minimal Node',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
      }

      await controller.createNewNode(simpleDtdlId, req)

      const [, entityJson] = addEntityToModelStub.firstCall.args
      const parsedEntity = JSON.parse(entityJson)
      expect(parsedEntity.description).to.be.undefined
      expect(parsedEntity.comment).to.equal('')
      expect(parsedEntity.extends).to.deep.equal([])
    })

    it('should throw InternalError when displayName already exists', async () => {
      const req = mockReq({})
      req.body = {
        displayName: 'test node',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
      }

      await expect(controller.createNewNode(simpleDtdlId, req)).to.be.rejectedWith(
        InternalError,
        "Display name 'TestNode' already exists."
      )

      expect(addEntityToModelStub.called).to.equal(false)
    })

    it('should throw validation error for invalid input', async () => {
      const req = mockReq({})
      req.body = {
        displayName: '',
        description: '',
        comment: '',
        extends: '',
        folderPath: '',
      }

      await expect(controller.createNewNode(simpleDtdlId, req)).to.be.rejected

      expect(addEntityToModelStub.called).to.equal(false)
    })
  })
})
