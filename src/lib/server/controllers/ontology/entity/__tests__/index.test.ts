import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { DataError } from '../../../../errors.js'
import { UpdateParams } from '../../../../models/controllerTypes.js'
import { octokitTokenCookie } from '../../../../models/cookieNames.js'
import { generatedSVGFixture } from '../../../../utils/mermaid/__tests__/fixtures.js'
import { mockGithubRequest } from '../../../__tests__/github.test.js'
import {
  arrayDtdlFileEntityId,
  arrayDtdlFileFixture,
  githubDtdlId,
  mockCache,
  mockGenerator,
  mockLogger,
  mockMutator,
  mockReqWithCookie,
  mockSession,
  otherPropertyName,
  propertyName,
  relationshipName,
  simpleDtdlFileEntityId,
  simpleDtdlFileFixture,
  simpleMockModelDb,
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

  const controller = new EntityController(simpleMockModelDb, ontologyController, mockGithubRequest, mockCache)

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
        .putRelationshipDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ relationshipUpdate: { displayName: newValue } })
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
        .putRelationshipDisplayName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
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

  describe('putPropertyName', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new property name on non-array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyName(req, githubDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        simpleDtdlFileFixture({ propertyUpdate: { name: newValue } })
      )
      expect(result).to.equal(updateLayoutOutput)
    })

    it('should update db and layout for new property name on array DTDL file', async () => {
      const putBody = {
        ...defaultParams,
        value: newValue,
        propertyName,
      }
      const result = await controller
        .putPropertyName(req, githubDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal(
        arrayDtdlFileFixture({ propertyUpdate: { name: newValue } })
      )

      expect(result).to.equal(updateLayoutOutput)
    })

    it('should error for new property name matching other property name', async () => {
      const putBody = {
        ...defaultParams,
        value: otherPropertyName,
        propertyName,
      }
      await expect(
        controller.putPropertyName(req, githubDtdlId, arrayDtdlFileEntityId, putBody).then(toHTMLString)
      ).to.be.rejectedWith(DataError, 'already exists')
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

  describe('invalid chars', () => {
    const invalidChars = [`"`, `\\`]
    invalidChars.forEach((char) => {
      const body = {
        ...defaultParams,
        value: char,
        relationshipName: '',
        propertyName: '',
      }
      const routes = [
        () => controller.putDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipDisplayName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipDescription(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putRelationshipComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyName(req, githubDtdlId, simpleDtdlFileEntityId, body),
        () => controller.putPropertyComment(req, githubDtdlId, simpleDtdlFileEntityId, body),
      ]
      routes.forEach((fn) => {
        it(`should error on ${char} char in value`, async () => {
          await expect(fn()).to.be.rejectedWith(DataError, 'Invalid JSON')
        })
      })
    })
  })
})
