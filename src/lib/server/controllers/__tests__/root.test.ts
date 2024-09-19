import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { direction, relationships } from '../../models/exampleOntology.js'
import Flowchart from '../../utils/mermaid/flowchart.js'
import { RootController } from '../root'
import { flowhchartMock, mockLogger, templateMock, toHTMLString } from './helpers'

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
    it('should return rendered root template', async () => {
      const controller = new RootController(templateMock, flowhchartMock, mockLogger)
      const result = await controller.get().then(toHTMLString)
      const flowchart = new Flowchart()
      expect(result).to.equal(`root_${flowchart.generateFlowchart(relationships, direction)}_root`)
    })
  })
})
