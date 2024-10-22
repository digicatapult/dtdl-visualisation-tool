import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import {
  flowchartFixture,
  flowchartFixtureFiltered,
  mockDtdlObjectModel,
} from '../../utils/mermaid/__tests__/flowchart.test.js'
import { RootController } from '../root'
import { mockDtdlLoader, mockLogger, mockReq, templateMock, toHTMLString } from './helpers'

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
    it('should return rendered root template', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)

      const result = await controller.get('dagre-d3').then(toHTMLString)
      expect(result).to.equal(`root_${flowchartFixture}_dagre-d3_undefined_root`)
    })

    it('should filter model by search if provided', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)

      const result = await controller.get('dagre-d3', 'example 1').then(toHTMLString)
      expect(result).to.equal(`root_${flowchartFixtureFiltered}_dagre-d3_example 1_root`)
    })

    it('should return parsed entity by ID', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)

      const id = 'dtmi:com:example;1'
      const result = await controller.getEntityById(id).then(toHTMLString)
      expect(result).to.equal(JSON.stringify(mockDtdlObjectModel[id], null, 4))
    })

    it('should return parsed entity by mermaid safe ID', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)

      const id = 'dtmi:com:example;1'
      const mermaidSafeId = 'dtmi:com:example:1' // :1 suffix instead of ;1
      const result = await controller.getEntityById(mermaidSafeId, 'mermaid').then(toHTMLString)
      expect(result).to.equal(JSON.stringify(mockDtdlObjectModel[id], null, 4))
    })
  })

  describe('updateLayout', () => {
    it('should return templated mermaidMarkdown and layoutForm', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)
      const req = mockReq({})
      const result = await controller.updateLayout(req).then(toHTMLString)
      expect(result).to.equal(
        [
          `mermaidMarkdown_${flowchartFixture}_dagre-d3_mermaidMarkdown`,
          `layoutForm_undefined_dagre-d3_true_layoutForm`,
        ].join('')
      )
    })

    it('should return templated mermaidMarkdown and layoutForm filtered', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)
      const req = mockReq({})
      const result = await controller.updateLayout(req, 'dagre-d3', 'example 1').then(toHTMLString)
      expect(result).to.equal(
        [
          `mermaidMarkdown_${flowchartFixtureFiltered}_dagre-d3_mermaidMarkdown`,
          `layoutForm_example 1_dagre-d3_true_layoutForm`,
        ].join('')
      )
    })

    it('should set HX-Replace-Url header if hx-current-url is passed', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path?param1=x&param2=y',
      })
      await controller.updateLayout(req).then(toHTMLString)

      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args).to.deep.equal(['HX-Replace-Url', '/some/path?param1=x&param2=y&layout=dagre-d3'])
      expect(stub.secondCall.args).to.deep.equal(['Content-Type', 'text/html'])
    })

    it('should overwrite layout in HX-Replace-Url header', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({
        'hx-current-url': 'http://localhost:3000/some/path?param1=x&layout=y',
      })
      await controller.updateLayout(req).then(toHTMLString)

      expect(stub.firstCall.args).to.deep.equal(['HX-Replace-Url', '/some/path?param1=x&layout=dagre-d3'])
    })

    it('should not set HX-Replace-Url header if hx-current-url is not passed', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({})
      await controller.updateLayout(req).then(toHTMLString)

      expect(stub.callCount).to.equal(1)
      expect(stub.firstCall.args).to.deep.equal(['Content-Type', 'text/html'])
    })
  })
})
