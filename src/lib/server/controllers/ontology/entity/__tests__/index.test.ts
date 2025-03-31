import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { DataError } from '../../../../errors.js'
import { UpdateParams } from '../../../../models/controllerTypes.js'
import { generatedSVGFixture } from '../../../../utils/mermaid/__tests__/fixtures.js'
import { mockGithubRequest } from '../../../__tests__/github.test.js'
import {
  arrayDtdlFile,
  arrayDtdlFileEntityId,
  mockCache,
  mockGenerator,
  mockLogger,
  mockMutator,
  mockReq,
  mockSession,
  simpleDtdlFile,
  simpleDtdlFileEntityId,
  simpleDtdlId,
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
        value: 'new display name',
      }
      const result = await controller
        .putDisplayName(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal({
        ...simpleDtdlFile,
        displayName: 'new display name',
      })
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_undefined_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    it('should update db and layout for new display name on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: 'new display name',
      }
      const result = await controller
        .putDisplayName(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal([
        arrayDtdlFile[0],
        {
          ...arrayDtdlFile[1],
          displayName: 'new display name',
        },
      ])
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_undefined_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    const invalidChars = [`"`, `\\`]
    invalidChars.forEach((char) => {
      it(`should error on ${char} char in entity value`, async () => {
        const req = mockReq({})
        const putBody = {
          ...defaultParams,
          value: char,
        }

        await expect(controller.putDisplayName(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)).to.be.rejectedWith(
          DataError,
          'Invalid JSON'
        )
      })
    })
  })

  describe('putDescription', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new description on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: 'new description',
      }
      const result = await controller
        .putDescription(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal({
        ...simpleDtdlFile,
        description: 'new description',
      })
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_undefined_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    it('should update db and layout for new description on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: 'new description',
      }
      const result = await controller
        .putDescription(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal([
        arrayDtdlFile[0],
        {
          ...arrayDtdlFile[1],
          description: 'new description',
        },
      ])
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_undefined_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    const invalidChars = [`"`, `\\`]
    invalidChars.forEach((char) => {
      it(`should error on ${char} char in entity value`, async () => {
        const req = mockReq({})
        const putBody = {
          ...defaultParams,
          value: char,
        }

        await expect(controller.putDescription(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)).to.be.rejectedWith(
          DataError,
          'Invalid JSON'
        )
      })
    })
  })

  describe('putInterfaceComment', () => {
    afterEach(() => updateDtdlContentsStub.resetHistory())

    it('should update db and layout for new interface comment on non-array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: 'new interface comment',
      }
      const result = await controller
        .putInterfaceComment(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal({
        ...simpleDtdlFile,
        comment: 'new interface comment',
      })
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_undefined_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    it('should update db and layout for new interface comment on array DTDL file', async () => {
      const req = mockReq({})
      const putBody = {
        ...defaultParams,
        value: 'new interface comment',
      }
      const result = await controller
        .putInterfaceComment(req, simpleDtdlId, arrayDtdlFileEntityId, putBody)
        .then(toHTMLString)
      expect(JSON.parse(updateDtdlContentsStub.firstCall.args[1])).to.deep.equal([
        arrayDtdlFile[0],
        {
          ...arrayDtdlFile[1],
          comment: 'new interface comment',
        },
      ])
      expect(result).to.equal(
        [
          `mermaidTarget_${generatedSVGFixture}_attr_mermaid-output_mermaidTarget`,
          `searchPanel_undefined_true_searchPanel`,
          `navigationPanel_true__navigationPanel`,
          `svgControls_${generatedSVGFixture}_svgControls`,
        ].join('')
      )
    })

    const invalidChars = [`"`, `\\`]
    invalidChars.forEach((char) => {
      it(`should error on ${char} char in entity value`, async () => {
        const req = mockReq({})
        const putBody = {
          ...defaultParams,
          value: char,
        }

        await expect(controller.putDisplayName(req, simpleDtdlId, simpleDtdlFileEntityId, putBody)).to.be.rejectedWith(
          DataError,
          'Invalid JSON'
        )
      })
    })
  })
})
