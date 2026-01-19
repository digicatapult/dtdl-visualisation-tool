import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { UpdateParams } from '../../models/controllerTypes.js'
import { RootController } from '../root'
import { defaultDtdlId, mockCache, mockLogger, simpleMockModelDb, templateMock } from './helpers'
import { validViewId } from './sessionFixtures.js'

export const defaultParams: UpdateParams = {
  viewId: validViewId,
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

  const controller = new RootController(simpleMockModelDb, templateMock, mockLogger)

  describe('get', () => {
    it('should redirect to the default model', async () => {
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      await controller.get({ ...defaultParams })

      const locationHeader = setHeaderSpy.firstCall.args[1]

      expect(locationHeader).to.equal(
        `/ontology/${defaultDtdlId}/view?${new URLSearchParams(Object.entries(defaultParams))}`
      )
    })
  })
})
