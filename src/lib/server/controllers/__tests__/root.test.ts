import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { RootController } from '../root'
import { flowhchartMock, mockLogger, templateMock, toHTMLString, mockRequestObject } from './helpers'
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
  })
})
