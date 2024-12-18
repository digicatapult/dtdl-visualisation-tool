import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { readFileSync } from 'fs'
import { describe, it } from 'mocha'
import path from 'path'
import sinon from 'sinon'
import { UploadError } from '../../errors.js'
import { UploadController } from '../upload.js'
import { mockCache, mockDb, mockSearch, simpleMockDtdlLoader, toHTMLString } from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

describe('UploadController', async () => {
  const controller = new UploadController(simpleMockDtdlLoader, mockDb, mockSearch, mockCache)

  afterEach(() => {
    sinon.restore()
  })

  describe('/', () => {
    it('should return file name on success', async () => {
      const originalname = 'test.zip'
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './simple.zip')),
        originalname,
      }
      const result = await controller.uploadZip(mockFile as Express.Multer.File).then(toHTMLString)
      expect(result).to.equal(originalname)
    })

    it(`should error on non-'application/zip' mimetype`, async () => {
      const mockFile = {
        mimetype: 'application/json',
      }

      await expect(controller.uploadZip(mockFile as Express.Multer.File)).to.be.rejectedWith(
        UploadError,
        'Only .zip accepted'
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
        'Unzipping error'
      )
    })

    it('should error on bad DTDL', async () => {
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './error.zip')),
      }
      await expect(controller.uploadZip(mockFile as Express.Multer.File)).to.be.rejectedWith(
        UploadError,
        'Failed to parse DTDL'
      )
    })
  })
})
