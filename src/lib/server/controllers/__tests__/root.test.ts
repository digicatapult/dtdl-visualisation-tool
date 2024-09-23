import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { dtdlObjectModel } from './fixtures/parsedDtdlObjectModel.js'
import Flowchart, { Direction } from '../../utils/mermaid/flowchart.js'
import { RootController } from '../root'
import { flowhchartMock, mockLogger, templateMock, toHTMLString, mockRequestObject } from './helpers'

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
    it('should return rendered root template', async () => {
      const controller = new RootController(templateMock, flowhchartMock, mockLogger)

      const result = await controller.get(mockRequestObject).then(toHTMLString)
      const flowchart = new Flowchart()
      expect(result).to.equal(`root_${flowchart.getFlowchartMarkdown(dtdlObjectModel, Direction.TopToBottom)}_root`)
    })
  })
})
