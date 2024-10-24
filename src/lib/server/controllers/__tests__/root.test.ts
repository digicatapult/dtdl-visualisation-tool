import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { QueryParams } from '../../models/contollerTypes.js'
import { flowchartFixtureFiltered, flowchartFixtureSimple, generatedSVGFixture, mockDtdlObjectModel } from '../../utils/mermaid/__tests__/fixtures'
import { RootController } from '../root'
import { mockGenerator, mockLogger, mockReq, simpleMockDtdlLoader, templateMock, toHTMLString } from './helpers'

export const defaultParams: QueryParams = {
  layout: 'dagre-d3',
  output: 'svg',
  chartType: 'flowchart',
}

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
  })

  const controller = new RootController(simpleMockDtdlLoader, mockGenerator, templateMock, mockLogger)

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
      const result = await controller.getEntityById(mermaidSafeId, 'flowchart').then(toHTMLString)
      expect(result).to.equal(JSON.stringify(mockDtdlObjectModel[id], null, 4))
    })
  })

  describe('updateLayout', () => {
    it('should return templated mermaidMarkdown and layoutForm', async () => {
      const req = mockReq({})
      const result = await controller.updateLayout(req, defaultParams).then(toHTMLString)
      expect(result).to.equal(
        [`mermaidTarget_${generatedSVGFixture}_mermaid-output_mermaidTarget`, `layoutForm_undefined_dagre-d3_true_layoutForm`].join('')
      )
    })

    it('should return templated mermaidMarkdown and layoutForm filtered', async () => {
      const req = mockReq({})
      const result = await controller.updateLayout(req, { ...defaultParams, search: 'example 1' }).then(toHTMLString)
      expect(result).to.equal(
        [`mermaidTarget_${generatedSVGFixture}_mermaid-output_mermaidTarget`, `layoutForm_example 1_dagre-d3_true_layoutForm`].join('')
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
        '/some/path?param1=x&param2=y&layout=dagre-d3&output=svg&chartType=flowchart',
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
        '/some/path?param1=x&layout=dagre-d3&output=svg&chartType=flowchart',
      ])
    })

    it('should not set HX-Push-Url header if hx-current-url is not passed', async () => {
      const stub = sinon.stub(controller, 'setHeader')

      const req = mockReq({})
      await controller.updateLayout(req, defaultParams).then(toHTMLString)

      expect(stub.callCount).to.equal(1)
      expect(stub.firstCall.args).to.deep.equal(['Content-Type', 'text/html'])
    })
  })
})
