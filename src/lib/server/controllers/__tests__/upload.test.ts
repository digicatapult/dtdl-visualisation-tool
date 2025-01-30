import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { readFileSync } from 'fs'
import { describe, it } from 'mocha'
import path from 'path'
import sinon from 'sinon'
import { DataError, UploadError } from '../../errors.js'
import { UploadController } from '../upload.js'
import {
  mockCache,
  mockDb,
  mockSearch,
  mockSession,
  openOntologyMock,
  simpleMockDtdlLoader,
  templateMock,
  toHTMLString,
} from './helpers.js'
import { validSessionId } from './sessionFixtures.js'

chai.use(chaiAsPromised)
const { expect } = chai

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

describe('UploadController', async () => {
  const controller = new UploadController(
    simpleMockDtdlLoader,
    mockDb,
    templateMock,
    openOntologyMock,
    mockSearch,
    mockCache,
    mockSession
  )

  afterEach(() => {
    sinon.restore()
  })

  describe('/', () => {
    it('should return root template on success', async () => {
      const originalname = 'test.zip'
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './simple.zip')),
        originalname,
      }
      const result = await controller.uploadZip(mockFile as Express.Multer.File, validSessionId).then(toHTMLString)
      expect(result).to.equal(`root_dagre-d3_undefined_root`)
    })

    it(`should error on non-'application/zip' mimetype`, async () => {
      const mockFile = {
        mimetype: 'application/json',
      }

      await expect(controller.uploadZip(mockFile as Express.Multer.File, validSessionId)).to.be.rejectedWith(
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
      await expect(controller.uploadZip(mockFile as Express.Multer.File, validSessionId)).to.be.rejectedWith(
        UploadError,
        'Uploaded zip file is not valid'
      )
    })

    it('should error on bad DTDL', async () => {
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './error.zip')),
      }
      await expect(controller.uploadZip(mockFile as Express.Multer.File, validSessionId)).to.be.rejectedWith(
        DataError,
        'Failed to parse DTDL model'
      )
    })
  })
})
