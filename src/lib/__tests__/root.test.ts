import { describe, it } from 'mocha'
import { RootController } from '../server/controllers/root'
import { pino } from 'pino'
import sinon from 'sinon'
import { expect } from 'chai'


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