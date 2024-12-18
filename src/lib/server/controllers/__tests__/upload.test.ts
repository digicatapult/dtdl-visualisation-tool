import { expect } from 'chai'
import { readFileSync } from 'fs'
import { describe, it } from 'mocha'
import path from 'path'
import { UploadController } from '../upload.js'
import { mockCache, mockDb, mockSearch, simpleMockDtdlLoader, toHTMLString } from './helpers.js'

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

describe.only('UploadController', async () => {
  const controller = new UploadController(simpleMockDtdlLoader, mockDb, mockSearch, mockCache)

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

    it('should only accept application/zip mimetype', async () => {
      const mockFile = {
        mimetype: 'application/json',
      }
      const result = await controller.uploadZip(mockFile as Express.Multer.File).then(toHTMLString)
      expect(result).to.equal('Only .zip accepted')
    })

    it('should fail on bad DTDL', async () => {
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, './error.zip')),
      }
      const result = await controller.uploadZip(mockFile as Express.Multer.File).then(toHTMLString)
      expect(result).to.equal('Failed to parse DTDL')
    })
  })
})
