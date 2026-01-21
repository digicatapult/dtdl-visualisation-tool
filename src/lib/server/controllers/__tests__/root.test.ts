import { expect } from 'chai'
import { describe, it } from 'mocha'
import pino from 'pino'
import sinon from 'sinon'
import { ModelDb } from '../../../db/modelDb.js'
import { UpdateParams } from '../../models/controllerTypes.js'
import { UUID } from '../../models/strings.js'
import { RootController } from '../root.js'
import { validViewId } from './fixtures/session.fixtures.js'

const defaultDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed9'

const simpleMockModelDb = {
  getDefaultModel: () => Promise.resolve({ id: defaultDtdlId }),
} as unknown as ModelDb

const templateMock = {} as never

const mockLogger = pino({ level: 'silent' })

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

describe('RootController', () => {
  afterEach(() => {
    sinon.restore()
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
