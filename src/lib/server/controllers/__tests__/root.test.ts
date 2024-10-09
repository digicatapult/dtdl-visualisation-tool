import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { flowchartFixture, mockDtdlObjectModel } from '../../utils/mermaid/__tests__/flowchart.test.js'
import { RootController } from '../root'
import { mockDtdlLoader, mockLogger, templateMock, toHTMLString } from './helpers'

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
    it('should return rendered root template', async () => {
      const controller = new RootController(mockDtdlLoader, templateMock, mockLogger)

      const result = await controller.get().then(toHTMLString)
      expect(result).to.equal(`root_${flowchartFixture}_root`)
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
})
