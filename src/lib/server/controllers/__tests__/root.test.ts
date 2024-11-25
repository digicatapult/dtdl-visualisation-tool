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
  simpleMockDtdlLoader,
  templateMock,
  toHTMLString,
} from './helpers'

export const defaultParams: UpdateParams = {
  layout: 'dagre-d3',
  output: 'svg',
  diagramType: 'flowchart',
  svgWidth: 300,
  svgHeight: 100,
}

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
    mockCache.clear()
  })

  const controller = new RootController(simpleMockDtdlLoader, mockGenerator, templateMock, mockLogger, mockCache)
  const complexController = new RootController(
    complexMockDtdlLoader,
    mockGenerator,
    templateMock,
    mockLogger,
    mockCache
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
          `mermaidTarget_${generatedSVGFixture}_mermaid-output_mermaidTarget`,
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
          `mermaidTarget_${generatedSVGFixture}_mermaid-output_mermaidTarget`,
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
        '/some/path?param1=x&param2=y&layout=dagre-d3&output=svg&diagramType=flowchart',
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
        '/some/path?param1=x&layout=dagre-d3&output=svg&diagramType=flowchart',
      ])
    })

    it('should not set HX-Push-Url header if hx-current-url is not passed', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({})
      await controller.updateLayout(req, defaultParams).then(toHTMLString)

      expect(stub.callCount).to.equal(1)
      expect(stub.firstCall.args).to.deep.equal(['Content-Type', 'text/html'])
    })

    it('should remove duplicate expandedIds', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await controller.updateLayout(req, { ...defaultParams, expandedIds: ['1', '1'] }).then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?layout=dagre-d3&output=svg&diagramType=flowchart&expandedIds=1',
      ])
    })

    it('should append multiple expandedIds', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await controller.updateLayout(req, { ...defaultParams, expandedIds: ['1', '2'] }).then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?layout=dagre-d3&output=svg&diagramType=flowchart&expandedIds=1&expandedIds=2',
      ])
    })

    it('should cache generated output - keyed by params', async () => {
      const req = mockReq({})
      const generatorRunCount = generatorRunStub.callCount
      await controller.updateLayout(req, defaultParams)
      expect(mockCache.get('diagramType=flowchart&expandedIds=&layout=dagre-d3&output=svg')).to.equal(
        generatedSVGFixture
      )

      await controller.updateLayout(req, defaultParams)
      expect(generatorRunStub.callCount).to.equal(generatorRunCount + 1)
    })

    it('should ignore lastSearch param when caching', async () => {
      const req = mockReq({})
      await controller.updateLayout(req, { ...defaultParams, lastSearch: 'someSearch' })
      await controller.updateLayout(req, { ...defaultParams, lastSearch: 'someOtherSearch' })
      expect(mockCache.size()).to.equal(1)
      expect(mockCache.get('diagramType=flowchart&expandedIds=&layout=dagre-d3&output=svg')).to.equal(
        generatedSVGFixture
      )
    })

    it('should truncate the last expandedId', async () => {
      const stub = sinon.stub(complexController, 'setHeader')
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, {
        ...defaultParams,
        search: 'example',
        lastSearch: 'example',
        shouldTruncate: true,
        highlightNodeId: '5',
        expandedIds: ['2', '3', '5'],
      })

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?layout=dagre-d3&output=svg&diagramType=flowchart&highlightNodeId=5&search=example&expandedIds=2&expandedIds=3&shouldTruncate=true&lastSearch=example',
      ])
    })

    it('should truncate no expanded Id', async () => {
      const stub = sinon.stub(complexController, 'setHeader')
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, {
        ...defaultParams,
        search: 'example',
        lastSearch: 'example',
        shouldTruncate: true,
        highlightNodeId: '1',
        expandedIds: ['2', '3', '5'],
      })

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?layout=dagre-d3&output=svg&diagramType=flowchart&highlightNodeId=1&search=example&expandedIds=2&expandedIds=3&expandedIds=5&shouldTruncate=true&lastSearch=example',
      ])
    })

    it('should truncate id 2 and 5', async () => {
      const stub = sinon.stub(complexController, 'setHeader')
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, {
        ...defaultParams,
        search: 'example',
        lastSearch: 'example',
        shouldTruncate: true,
        highlightNodeId: '2',
        expandedIds: ['2', '3', '5'],
      })

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?layout=dagre-d3&output=svg&diagramType=flowchart&highlightNodeId=2&search=example&expandedIds=3&shouldTruncate=true&lastSearch=example',
      ])
    })

    it('should truncate id 2 and 5 and leave 3 expanded', async () => {
      const stub = sinon.stub(complexController, 'setHeader')
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, {
        ...defaultParams,
        search: 'example',
        lastSearch: 'example',
        shouldTruncate: true,
        highlightNodeId: '2',
        expandedIds: ['2', '3', '5'],
      })

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?layout=dagre-d3&output=svg&diagramType=flowchart&highlightNodeId=2&search=example&expandedIds=3&shouldTruncate=true&lastSearch=example',
      ])
    })

    it('should truncate id 3 and 7', async () => {
      const stub = sinon.stub(complexController, 'setHeader')
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, {
        ...defaultParams,
        search: 'example',
        lastSearch: 'example',
        shouldTruncate: true,
        highlightNodeId: '3',
        expandedIds: ['2', '3', '5', '7'],
      })

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?layout=dagre-d3&output=svg&diagramType=flowchart&highlightNodeId=3&search=example&expandedIds=2&expandedIds=5&shouldTruncate=true&lastSearch=example',
      ])
    })

    it('should only truncate nodes that were brought into scope by expansion of highlightNodeId', async () => {
      const stub = sinon.stub(complexController, 'setHeader')
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, {
        ...defaultParams,
        search: 'example',
        lastSearch: 'example',
        shouldTruncate: true,
        highlightNodeId: '5',
        expandedIds: ['7', '5', '9'],
      })

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?layout=dagre-d3&output=svg&diagramType=flowchart&highlightNodeId=5&search=example&expandedIds=7&expandedIds=9&shouldTruncate=true&lastSearch=example',
      ])
    })

    it('should truncate extended relationships', async () => {
      const stub = sinon.stub(complexController, 'setHeader')
      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path',
      })
      await complexController.updateLayout(req, {
        ...defaultParams,
        search: 'example',
        lastSearch: 'example',
        shouldTruncate: true,
        highlightNodeId: '9',
        expandedIds: ['9', '10'],
      })

      expect(stub.firstCall.args).to.deep.equal([
        'HX-Push-Url',
        '/some/path?layout=dagre-d3&output=svg&diagramType=flowchart&highlightNodeId=9&search=example&shouldTruncate=true&lastSearch=example',
      ])
    })
  })
})
