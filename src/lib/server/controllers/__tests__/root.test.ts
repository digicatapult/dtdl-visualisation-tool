import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { UpdateParams } from '../../models/controllerTypes.js'
import { generatedSVGFixture, mockDtdlObjectModel } from '../../utils/mermaid/__tests__/fixtures'
import { RootController } from '../root'
import {
  complexMockDtdlLoader,
  generatorRunStub,
  mockCache,
  mockGenerator,
  mockLogger,
  mockReq,
  mockSearch,
  mockSession,
  sessionSetStub,
  simpleMockDtdlLoader,
  templateMock,
  toHTMLString,
} from './helpers'
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
} from './sessionFixtures.js'

export const defaultParams: UpdateParams = {
  sessionId: validSessionId,
  layout: 'dagre-d3',
  diagramType: 'flowchart',
  svgWidth: 300,
  svgHeight: 100,
  currentPanX: 0,
  currentPanY: 0,
  currentZoom: 1,
  a11y: ['reduce-motion'],
}

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
    mockCache.clear()
  })

  const controller = new RootController(
    simpleMockDtdlLoader,
    mockGenerator,
    templateMock,
    mockSearch,
    mockLogger,
    mockCache,
    mockSession
  )
  const complexController = new RootController(
    complexMockDtdlLoader,
    mockGenerator,
    templateMock,
    mockSearch,
    mockLogger,
    mockCache,
    mockSession
  )

  describe('get', () => {
    it('should return rendered root template', async () => {
      const result = await controller.get({ ...defaultParams }).then(toHTMLString)
      expect(result).to.equal(`root_dagre-d3_undefined_root`)
    })

    it('should return parsed entity by ID', async () => {
      const id = 'dtmi:com:example;1'
      const result = await controller.getEntityById(id).then(toHTMLString)
      expect(result).to.equal(JSON.stringify(mockDtdlObjectModel[id], null, 4))
    })

    it('should return parsed entity by mermaid safe ID', async () => {
      const id = 'dtmi:com:example;1'
      const mermaidSafeId = 'dtmi:com:example:1' // :1 suffix instead of ;1
      const result = await controller.getEntityById(mermaidSafeId).then(toHTMLString)
      expect(result).to.equal(JSON.stringify(mockDtdlObjectModel[id], null, 4))
    })
  })

  describe('updateLayout', () => {
    it('should return templated mermaidMarkdown and searchPanel', async () => {
      const req = mockReq({})
      const result = await controller.updateLayout(req, defaultParams).then(toHTMLString)
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_undefined_dagre-d3_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
        ].join('')
      )
    })

    it('should return templated mermaidMarkdown and searchPanel filtered', async () => {
      const req = mockReq({})
      const result = await controller.updateLayout(req, { ...defaultParams, search: 'example 1' }).then(toHTMLString)
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_example 1_dagre-d3_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
        ].join('')
      )
    })

    it('should set HX-Push-Url header if hx-current-url is passed', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path?param1=x&param2=y',
      })
      await controller.updateLayout(req, defaultParams).then(toHTMLString)

      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?param1=x&param2=y&layout=dagre-d3&diagramType=flowchart',
      ])
      expect(stub.secondCall.args).to.deep.equal(['Content-Type', 'text/html'])
    })

    it('should overwrite layout in HX-Push-Url header', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path?param1=x&layout=y',
      })
      await controller.updateLayout(req, defaultParams).then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?param1=x&layout=dagre-d3&diagramType=flowchart',
      ])
    })

    it('should not set HX-Push-Url header if hx-current-url is not passed', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({})
      await controller.updateLayout(req, defaultParams).then(toHTMLString)

      expect(stub.callCount).to.equal(1)
      expect(stub.firstCall.args).to.deep.equal(['Content-Type', 'text/html'])
    })

    it('should update the stored session', async () => {
      const stub = sessionSetStub
      const initCallCount = stub.callCount

      const req = mockReq({})
      await controller
        .updateLayout(req, { ...defaultParams, search: '"example 1"', highlightNodeId: 'dtmi:com:example;1' })
        .then(toHTMLString)

      expect(stub.callCount).lessThanOrEqual(initCallCount + 1)
      expect(stub.lastCall.args[0]).to.equal(validSessionId)
      expect(stub.lastCall.args[1]).to.deep.equal({
        diagramType: 'flowchart',
        expandedIds: [],
        layout: 'dagre-d3',
        search: '"example 1"',
        highlightNodeId: 'dtmi:com:example;1',
      })
    })

    it('should remove duplicate expandedIds', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await controller.updateLayout(req, { ...defaultParams, sessionId: validSessionExpanded11Id }).then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal(['HX-Push-Url', '/some/path?layout=dagre-d3&diagramType=flowchart'])
    })

    it('should append multiple expandedIds', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await controller.updateLayout(req, { ...defaultParams, sessionId: validSessionExpanded12Id }).then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal(['HX-Push-Url', '/some/path?layout=dagre-d3&diagramType=flowchart'])
    })

    it('should cache generated output - keyed by params', async () => {
      const req = mockReq({})
      const generatorRunCount = generatorRunStub.callCount
      await controller.updateLayout(req, defaultParams)
      expect(mockCache.get('diagramType=flowchart&layout=dagre-d3')).to.equal(generatedSVGFixture)

      await controller.updateLayout(req, defaultParams)
      expect(generatorRunStub.callCount).to.equal(generatorRunCount + 1)
    })

    it('should ignore lastSearch param when caching', async () => {
      const req = mockReq({})
      await controller.updateLayout(req, { ...defaultParams, sessionId: validSessionSomeSearchId })
      await controller.updateLayout(req, { ...defaultParams, sessionId: validSessionSomeOtherSearchId })
      expect(mockCache.size()).to.equal(1)
      expect(mockCache.get('diagramType=flowchart&layout=dagre-d3')).to.equal(generatedSVGFixture)
    })

    it('should truncate the last expandedId', async () => {
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, {
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
      await complexController.updateLayout(req, {
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
      await complexController.updateLayout(req, {
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
      await complexController.updateLayout(req, {
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
      await complexController.updateLayout(req, {
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
      await complexController.updateLayout(req, {
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
      await controller.updateLayout(req, defaultParams)

      const result = await controller
        .updateLayout(req, {
          ...defaultParams,
          search: 'example',
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_animate_mermaid-output_mermaidTarget`,
          `searchPanel_example_dagre-d3_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
        ].join('')
      )
    })

    it('should not animate if cache is empty', async () => {
      const req = mockReq({})

      const result = await controller
        .updateLayout(req, {
          ...defaultParams,
          search: 'example',
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_example_dagre-d3_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
        ].join('')
      )
    })

    it('should not animate if diagram type changes', async () => {
      const req = mockReq({})
      // run with default params to setup the cache
      await controller.updateLayout(req, { ...defaultParams, diagramType: 'classDiagram' })

      const result = await controller
        .updateLayout(req, {
          ...defaultParams,
          search: 'example',
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_example_dagre-d3_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
        ].join('')
      )
    })

    it('should not animate if only highlighted node changes', async () => {
      const req = mockReq({})
      // run with default params to setup the cache
      await controller.updateLayout(req, defaultParams)

      const result = await controller
        .updateLayout(req, {
          ...defaultParams,
          highlightNodeId: 'example',
          a11y: [],
        })
        .then(toHTMLString)

      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_undefined_dagre-d3_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
        ].join('')
      )
    })
  })
})
