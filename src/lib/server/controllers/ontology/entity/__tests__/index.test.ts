import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { DataError, InternalError } from '../../../../errors.js'
import { UpdateParams } from '../../../../models/controllerTypes.js'
import { octokitTokenCookie } from '../../../../models/cookieNames.js'
import { DtdlSchema } from '../../../../models/strings.js'
import { generatedSVGFixture } from '../../../../utils/mermaid/__tests__/fixtures.js'
import { mockGithubRequest } from '../../../__tests__/github.test.js'
import {
  arrayDtdlFileEntityId,
  arrayDtdlFileFixture,
  commandName,
  githubDtdlId,
  mockCache,
  mockGenerator,
  mockLogger,
  mockMutator,
  mockReqWithCookie,
  mockSession,
  propertyName,
  relationshipName,
  simpleDtdlFileEntityId,
  simpleDtdlFileFixture,
  simpleMockModelDb,
  telemetryName,
  templateMock,
  toHTMLString,
  updateDtdlContentsStub,
} from '../../../__tests__/helpers.js'
import { validSessionId } from '../../../__tests__/sessionFixtures.js'
import { OntologyController } from '../../index.js'
import { EntityController } from '../index.js'

chai.use(chaiAsPromised)
const { expect } = chai

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
  const req = mockReqWithCookie({
    [octokitTokenCookie]: 'valid-token',
  })
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

  const controller = new EntityController(simpleMockModelDb, ontologyController, templateMock, mockSession, mockCache)

  describe('putDisplayName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new display name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ interfaceUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new display name on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
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
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship display name on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
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
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ interfaceUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller
        .putDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
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
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { description: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new interface comment on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller.putComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody).then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ interfaceUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new interface comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
      }
      const result = await controller.putComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody).then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ interfaceUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putRelationshipComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new relationship comment name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        relationshipName,
      }
      const result = await controller
        .putRelationshipComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { comment: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putRelationshipTarget', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new relationship target on non-array DTDL file', async () => {
      const newTarget = 'dtmi:com:new_target;1'
      const putBody = {
        ...defaultParams,
        value: newTarget,
        relationshipName,
      }
      const result = await controller
        .putRelationshipTarget(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { target: newTarget } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new relationship target on array DTDL file', async () => {
      const newTarget = 'dtmi:com:new_target;1'
      const putBody = {
        ...defaultParams,
        value: newTarget,
        relationshipName,
      }
      const result = await controller
        .putRelationshipTarget(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ relationshipUpdate: { target: newTarget } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertyDisplayName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new property display name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property display name on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { displayName: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertyDescription', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new property description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { description: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertyComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new property comment name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { comment: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertySchema', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new property schema on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'float' as const,
        propertyName,
      }
      const result = await controller
        .putPropertySchema(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { schema: 'float' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property schema on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'float' as const,
        propertyName,
      }
      const result = await controller
        .putPropertySchema(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { schema: 'float' } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putPropertyWritable', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new property writable on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'false',
        propertyName,
      }
      const result = await controller
        .putPropertyWritable(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { writable: false } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property writable on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'false',
        propertyName,
      }
      const result = await controller
        .putPropertyWritable(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { writable: false } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetryComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new telemetry comment on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
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
      const putBody = {
        ...defaultParams,
        value: 'boolean' as DtdlSchema,
        telemetryName,
      }
      const result = await controller
        .putTelemetrySchema(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { schema: 'boolean' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry schema on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'boolean' as DtdlSchema,
        telemetryName,
      }
      const result = await controller
        .putTelemetrySchema(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { schema: 'boolean' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putTelemetryDescription', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new telemetry description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
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
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ telemetryUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new telemetry displayName on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        telemetryName,
      }
      const result = await controller
        .putTelemetryDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ telemetryUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandDisplayName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command displayName on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ commandUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command displayName on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ commandUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandDescription', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ commandUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ commandUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command comment on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ commandUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ commandUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandRequestDisplayName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command request displayName on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ commandRequestUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command request displayName on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ commandRequestUpdate: { displayName: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandRequestComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command request comment on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ commandRequestUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command request comment on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestComment(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ commandRequestUpdate: { comment: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandRequestDescription', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command request description on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ commandRequestUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command request description on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName,
      }
      const result = await controller
        .putCommandRequestDescription(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ commandRequestUpdate: { description: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandRequestSchema', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command request schema on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'integer' as DtdlSchema,
        commandName,
      }
      const result = await controller
        .putCommandRequestSchema(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ commandRequestUpdate: { schema: 'integer' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new command request schema on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: 'integer' as DtdlSchema,
        commandName,
      }
      const result = await controller
        .putCommandRequestSchema(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ commandRequestUpdate: { schema: 'integer' } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandResponseDisplayName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command response displayName', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName: commandName,
      }
      const result = await controller
        .putCommandResponseDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)

      expect(updateDtdlContentsStub.calledOnce).to.be.equal(true)
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandResponseComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command response comment', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName: commandName,
      }
      const result = await controller
        .putCommandResponseComment(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)

      expect(updateDtdlContentsStub.calledOnce).to.be.equal(true)
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandResponseDescription', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command response description', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        commandName: commandName,
      }
      const result = await controller
        .putCommandResponseDescription(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)

      expect(updateDtdlContentsStub.calledOnce).to.be.equal(true)
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('putCommandResponseSchema', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new command response schema', async () => {
      const putBody = {
        ...defaultParams,
        value: 'boolean' as DtdlSchema,
        commandName: commandName,
      }
      const result = await controller
        .putCommandResponseSchema(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)

      expect(updateDtdlContentsStub.calledOnce).to.be.equal(true)
      expect(result).to.equal(updateLayoutOutput)
    })
  })

  describe('invalid chars', () => {
    const invalidChars = [`"`, `\\`]
    invalidChars.forEach((char) => {
      const body = {
        ...defaultParams,
        value: char,
        relationshipName: '',
        propertyName: '',
        telemetryName: '',
        commandName: '',
      }
      const routes = [
        () => controller.putDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putTelemetryDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putTelemetryDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putTelemetryComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandRequestDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandRequestDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandRequestComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandResponseDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandResponseDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putCommandResponseComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
      ]
      routes.forEach((fn) => {
        it(`should error on ${char} char in value`, async () => {
          await expect(fn()).to.be.rejectedWith(DataError, 'Invalid JSON')
        })
      })
    })
  })

  describe('deleteDialog', () => {
    it('should return templated delete dialog', async () => {
      const result = await controller.deleteDialog(githubDtdlId, 'dtmi:com:example;1').then(toHTMLString)

      expect(result).to.equal('deleteDialog_deleteDialog')
    })
  })

  describe('deleteInterface', () => {
    it('should throw not implemented', async () => {
      await expect(controller.deleteInterface()).to.be.rejectedWith(InternalError, 'Not implemented yet')
    })
  })

  describe('deleteContent', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout to delete content on non-array DTDL file', async () => {
      const result = await controller
        .deleteContent(req, githubDtdlId, simpleDtdlFileEntityId, { contentName: relationshipName, ...defaultParams })
        .then(toHTMLString)

      const file = simpleDtdlFileFixture({})
      const fileWithoutRelationship = {
        ...file,
        contents: file.contents.filter((c) => c.name !== relationshipName),
      }
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(fileWithoutRelationship)
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout to delete content on array DTDL file', async () => {
      const result = await controller
        .deleteContent(req, githubDtdlId, arrayDtdlFileEntityId, { contentName: relationshipName, ...defaultParams })
        .then(toHTMLString)

      const file = arrayDtdlFileFixture({})[1]
      const fileWithoutRelationship = {
        ...file,
        contents: file.contents.filter((c) => c.name !== relationshipName),
      }
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal([
        simpleDtdlFileFixture({}),
        fileWithoutRelationship,
      ])
      expect(result).to.equal(updateLayoutOutput)
    })
  })
})
