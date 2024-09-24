import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { RootController } from '../root'
import { flowhchartMock, mockLogger, templateMock, toHTMLString, mockRequestObject, mockRequestObjectUndefined } from './helpers'
import { flowchartFixture } from '../../utils/mermaid/__tests__/flowchart.test.js'

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
    it('should return rendered root template', async () => {
      const controller = new RootController(templateMock, flowhchartMock, mockLogger)

      const result = await controller.get(mockRequestObject).then(toHTMLString)
      expect(result).to.equal(`root_${flowchartFixture}_root`)
    })
    it('should render failed to generate mermaid diagram', async () => {
      const controller = new RootController(templateMock, flowhchartMock, mockLogger)

      const result = await controller.get(mockRequestObjectUndefined).then(toHTMLString)
      expect(result).to.equal(`<p>The DTDL ontology at path  produced a parseError</p>`)
    })
  })
})
