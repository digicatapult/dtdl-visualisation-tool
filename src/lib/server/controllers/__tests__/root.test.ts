import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import sinon from 'sinon'
import { RootController } from '../root'

describe('RootController', async () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
    it('should return Hello, World', async () => {
      const mockLogger = pino({ level: 'silent' })
      const controller = new RootController(mockLogger)
      const result = await controller.get()
      expect(result).to.equal('Hello, World')
    })
  })
})
