import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { readFileSync } from 'fs'
import { describe, it } from 'mocha'
import path from 'path'
import sinon from 'sinon'
import { DataError, UploadError } from '../../errors.js'
import { modelHistoryCookie } from '../../models/cookieNames.js'
import { OpenOntologyController } from '../upload.js'
import {
  mockCache,
  mockGenerator,
  mockLogger,
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

describe('OpenOntologyController', async () => {
  const controller = new OpenOntologyController(
    simpleMockModelDb,
    mockGenerator,
    openOntologyMock,
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
      expect(result).to.equal(`root_undefined_root`)
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
      expect(result).to.equal(`root_undefined_root`)
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

      expect(openOntologyRootSpy.calledOnce).to.equal(true)
      expect(
        openOntologyRootSpy.calledWithMatch({
          recentFiles: sinon.match.array.deepEquals([
            {
              fileName: 'Preview Model',
              lastVisited: 'over 3 years ago',
              preview: 'Preview',
              dtdlModelId: previewDtdlId,
            },
          ]),
        })
      ).to.equal(true)
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
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const insertModelDb = sinon.spy(simpleMockModelDb, 'insertModel')
      const originalname = 'test.zip'
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './simple.zip')),
        originalname,
      }
      await controller.uploadZip(mockFile as Express.Multer.File)
      const hxRedirectHeader = setHeaderSpy.firstCall.args[1]

      expect(insertModelDb.calledOnce).to.equal(true)
      expect(hxRedirectHeader).to.equal(`/ontology/1/view`)
    })

    it(`should error on non-'application/zip' mimetype`, async () => {
      const mockFile = {
        mimetype: 'application/json',
      }

      await expect(controller.uploadZip(mockFile as Express.Multer.File)).to.be.rejectedWith(
        UploadError,
        'File must be a .zip'
      )
    })

    it('should handle unzipping error', async () => {
      sinon.stub(controller, 'unzip').throws(new Error('Mock error'))
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './simple.zip')),
      }
      await expect(controller.uploadZip(mockFile as Express.Multer.File)).to.be.rejectedWith(
        UploadError,
        'Uploaded zip file is not valid'
      )
    })

    it('should error on bad DTDL', async () => {
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './error.zip')),
      }
      await expect(controller.uploadZip(mockFile as Express.Multer.File)).to.be.rejectedWith(
        DataError,
        'Failed to parse DTDL model'
      )
    })
  })
})
