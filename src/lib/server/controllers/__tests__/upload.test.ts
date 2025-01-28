import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { readFileSync } from 'fs'
import { describe, it } from 'mocha'
import path from 'path'
import sinon from 'sinon'
import { DataError, UploadError } from '../../errors.js'
import { UploadController } from '../upload.js'
import { mockDb } from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

describe('UploadController', async () => {
  const controller = new UploadController(mockDb)

  afterEach(() => {
    sinon.restore()
  })

  describe('/', () => {
    it('should insert to db and redirect to view on success', async () => {
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const insertDb = sinon.spy(mockDb, 'insert')
      const originalname = 'test.zip'
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './simple.zip')),
        originalname,
      }
      await controller.uploadZip(mockFile as Express.Multer.File)

      const hxRedirectHeader = setHeaderSpy.firstCall.args[1]

      expect(insertDb.calledOnce).to.equal(true)
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
