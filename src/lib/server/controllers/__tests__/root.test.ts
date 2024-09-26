import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { flowchartFixture } from '../../utils/mermaid/__tests__/flowchart.test.js'
import { RootController } from '../root'
import {
  flowhchartMock,
  mockLogger,
  templateMock,
  toHTMLString,
  mockDtdlLoader
} from './helpers'

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
    it('should return rendered root template', async () => {
      const controller = new RootController(mockDtdlLoader,templateMock, flowhchartMock, mockLogger)

      const result = await controller.get().then(toHTMLString)
      expect(result).to.equal(`root_${flowchartFixture}_root`)
    })
  })
})
