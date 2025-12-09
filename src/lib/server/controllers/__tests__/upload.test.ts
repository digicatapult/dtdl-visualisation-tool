import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { readFileSync } from 'fs'
import { describe, it } from 'mocha'
import path from 'path'
import sinon from 'sinon'
import { UploadError } from '../../errors.js'
import { modelHistoryCookie } from '../../models/cookieNames.js'
import Parser from '../../utils/dtdl/parser.js'
import { simpleMockDtdlObjectModel } from '../../utils/mermaid/__tests__/fixtures.js'
import { OpenOntologyController } from '../upload.js'
import {
  mockCache,
  mockGenerator,
  mockLogger,
  mockPostHog,
  mockReq,
  mockReqWithCookie,
  openOntologyMock,
  previewDtdlId,
  simpleMockModelDb,
  toHTMLString,
} from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const unzipJsonFilesStub = sinon.stub()

export const mockParser = {
  validate: sinon.stub().callsFake(async (files) => files),
  parseAll: sinon.stub().resolves(simpleMockDtdlObjectModel),
  unzipJsonFiles: unzipJsonFilesStub,
} as unknown as Parser

describe('OpenOntologyController', async () => {
  const controller = new OpenOntologyController(
    simpleMockModelDb,
    mockGenerator,
    openOntologyMock,
    mockParser,
    mockPostHog,
    mockLogger,
    mockCache
  )

  afterEach(() => {
    sinon.restore()
  })

  describe('/', () => {
    const req = mockReqWithCookie({})
    it('Should return rendered open ontology template', async () => {
      const result = await controller.open(req).then(toHTMLString)
      expect(result).to.equal(`root_root`)
    })
    it('Should set HX-Push-Url header when session ID is provided', async () => {
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      await controller.open(req)
      expect(setHeaderSpy.calledWith('HX-Push-Url', `/open`)).to.equal(true)
    })
    it('Should handle missing cookie gracefully', async () => {
      const reqWithoutCookie = mockReqWithCookie({})
      reqWithoutCookie.signedCookies = {}

      const result = await controller.open(reqWithoutCookie).then(toHTMLString)
      expect(result).to.equal(`root_root`)
    })
    it('Should filter out invalid models from cookie history', async () => {
      const req = mockReqWithCookie({
        [modelHistoryCookie]: [
          { id: previewDtdlId, timestamp: 1633024800000 },
          { id: 'invalid', timestamp: 1633024800001 },
        ],
      })

      const openOntologyRootSpy = sinon.spy(openOntologyMock, 'OpenOntologyRoot')

      await controller.open(req).then(toHTMLString)

      const calledWithFiles = openOntologyRootSpy.firstCall.args[0].recentFiles
      expect(calledWithFiles).to.have.lengthOf(1)
      expect(calledWithFiles[0].dtdlModelId).to.equal(previewDtdlId)
    })
  })
  describe('menu', () => {
    it('Should return rendered upload method template', async () => {
      const result = await controller.getMenu(true).then(toHTMLString)
      expect(result).to.equal(`uploadMethod_${true}_uploadMethod`)
    })
  })

  describe('zip upload', () => {
    it('should insert to db and redirect to view on success', async () => {
      unzipJsonFilesStub.resolves([{ path: '', contents: '' }])
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const insertModel = sinon.spy(simpleMockModelDb, 'insertModel')
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './simple.zip')),
        originalname: 'test.zip',
      }
      const req = mockReq({})
      await controller.uploadZip(mockFile as Express.Multer.File, req)
      const hxRedirectHeader = setHeaderSpy.firstCall.args[1]

      // assert model and file inserted
      expect(insertModel.calledOnce).to.equal(true)
      expect(hxRedirectHeader).to.equal(`/ontology/1/view`)
    })

    it(`should error on non-'application/zip' mimetype`, async () => {
      const mockFile = {
        mimetype: 'application/json',
      }
      const req = mockReq({})

      await expect(controller.uploadZip(mockFile as Express.Multer.File, req)).to.be.rejectedWith(
        UploadError,
        'File must be a .zip'
      )
    })

    it('should throw error if no json files found', async () => {
      unzipJsonFilesStub.resolves([])
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './simple.zip')),
      }
      const req = mockReq({})

      await expect(controller.uploadZip(mockFile as Express.Multer.File, req)).to.be.rejectedWith(
        UploadError,
        `No valid '.json' files found`
      )
    })
  })
})
