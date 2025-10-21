import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { DataError } from '../../../../errors.js'
import { UpdateParams } from '../../../../models/controllerTypes.js'
import { generatedSVGFixture } from '../../../../utils/mermaid/__tests__/fixtures.js'
import { mockGithubRequest } from '../../../__tests__/github.test.js'
import {
  arrayDtdlFileEntityId,
  arrayDtdlFileFixture,
  mockCache,
  mockGenerator,
  mockLogger,
  mockMutator,
  mockReq,
  mockSession,
  otherPropertyName,
  propertyName,
  relationshipName,
  simpleDtdlFileEntityId,
  simpleDtdlFileFixture,
  simpleDtdlId,
  simpleMockModelDb,
  telemetryName,
  templateMock,
  toHTMLString,
  updateDtdlContentsStub,
} from '../../../__tests__/helpers.js'
import { validSessionId } from '../../../__tests__/sessionFixtures.js'
import { OntologyController } from '../../index.js'
import { EntityController } from '../index.js'

export const defaultParams: UpdateParams = {
  sessionId: validSessionId,
  diagramType: 'flowchart',
  svgWidth: 300,
  svgHeight: 100,
  currentPanX: 0,
  currentPanY: 0,
  currentZoom: 1,
  a11y: ['reduce-motion'],
}

const updateLayoutOutput = [
  `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output-message_mermaidTarget`,
  `searchPanel_undefined_true_searchPanel`,
  `navigationPanel_true__navigationPanel`,
  `svgControls_${generatedSVGFixture}_svgControls`,
].join('')
const newValue = 'updated'

describe('EntityController', async () => {
  afterEach(() => {
    sinon.restore()
    mockCache.clear()
  })

  const ontologyController = new OntologyController(
    simpleMockModelDb,
    mockGenerator,
    mockMutator,
    templateMock,
    mockLogger,
    mockCache,
    mockSession,
    mockGithubRequest
  )

  const controller = new EntityController(simpleMockModelDb, ontologyController, mockCache)

  describe('putDisplayName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new display name on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDisplayName(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ interfaceUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new display name on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDisplayName(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ interfaceUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putRelationshipDisplayName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new relationship display name on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDisplayName(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship display name on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDisplayName(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { displayName: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putDescription', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new description on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDescription(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ interfaceUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new description on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDescription(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ interfaceUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putRelationshipDescription', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new relationship description on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDisplayName(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship description on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDisplayName(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { displayName: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new interface comment on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller.putComment(req, simpleDtdlId, simpleDtdlFileEntityId, putBody).then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ interfaceUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new interface comment on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller.putComment(req, simpleDtdlId, arrayDtdlFileEntityId, putBody).then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ interfaceUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putRelationshipComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new relationship comment name on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipComment(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship comment on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipComment(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { comment: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertyName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new property name on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyName(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { name: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property name on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyName(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { name: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })

    it('should error for new property name matching other property name', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: otherPropertyName,
        propertyName,
      }
      await expect(
        controller.putPropertyName(req, simpleDtdlId, arrayDtdlFileEntityId, putBody).then(toHTMLString)
      ).to.be.rejectedWith(DataError, 'already exists')
    })
  })

  describe('putPropertyComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new property comment name on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyComment(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property comment on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyComment(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { comment: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('invalid chars', () => {
    const req = mockReq({})

    const invalidChars = [`"`, `\\`]
    invalidChars.forEach((char) => {
      const body = {
        ...defaultParams,
        value: char,
        relationshipName: '',
        propertyName: '',
      }
      const routes = [
        () => controller.putDisplayName(req, simpleDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putDescription(req, simpleDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putComment(req, simpleDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipDisplayName(req, simpleDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipDescription(req, simpleDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipComment(req, simpleDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyName(req, simpleDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyComment(req, simpleDtdlId, simpleDtdlFileEntityId, body),
      ]
      routes.forEach((fn) => {
        it(`should error on ${char} char in value`, async () => {
          await expect(fn()).to.be.rejectedWith(DataError, 'Invalid JSON')
        })
      })
    })
  })

  describe('putTelemetryName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new telemetry name on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryName(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { name: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry name on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryName(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { name: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetryComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new telemetry comment on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryComment(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry comment on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryComment(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetrySchema', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new telemetry schema on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: 'string',
        telemetryName,
      }
      const result = await controller
        .putTelemetrySchema(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { schema: 'string' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry schema on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: 'string',
        telemetryName,
      }
      const result = await controller
        .putTelemetrySchema(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { schema: 'string' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetryDescription', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new telemetry description on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDescription(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry description on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDescription(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetryDisplayName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new telemetry displayName on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDisplayName(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry displayName on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDisplayName(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })
})
