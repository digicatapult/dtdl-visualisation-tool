import { expect } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { pino } from 'pino'
import puppeteer from 'puppeteer'
import sinon from 'sinon'

import { defaultParams } from '../../../controllers/__tests__/root.test'
import { SvgGenerator } from '../generator'
import { simpleMockDtdlObjectModel } from './fixtures'
import { checkIfStringIsSVG } from './helpers'

describe('Generator', function () {
  this.timeout(10000)
  const logger = pino({ level: 'silent' })
  const generator = new SvgGenerator(logger)

  afterEach(() => {
    sinon.restore()
  })

  describe('run', () => {
    it('should return no graph for empty object model', async () => {
      const generatedOutput = await generator.run({}, defaultParams.diagramType, defaultParams.layout)
      expect(generatedOutput.type).to.equal('text')
      expect(generatedOutput.renderToString()).to.equal(`No graph`)
    })

    it('should return a simple svg', async () => {
      const generatedOutput = await generator.run(
        simpleMockDtdlObjectModel,
        defaultParams.diagramType,
        defaultParams.layout
      )
      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.renderToString())).to.equal(true)
    })

    it('should retry if an error occurs', async () => {
      const stub = sinon.stub(puppeteer, 'launch').onFirstCall().rejects('Error').callThrough()
      const generator = new SvgGenerator(logger)

      const generatedOutput = await generator.run(
        simpleMockDtdlObjectModel,
        defaultParams.diagramType,
        defaultParams.layout
      )

      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.renderToString())).to.equal(true)
      expect(stub.callCount).to.equal(2)
    })

    it('will only retry once', async () => {
      const stub = sinon.stub(puppeteer, 'launch').rejects('Error')
      const generator = new SvgGenerator(logger)

      let error: Error | null = null
      try {
        await generator.run(simpleMockDtdlObjectModel, defaultParams.diagramType, defaultParams.layout)
      } catch (err) {
        error = err as Error
      }

      expect(error?.name).to.equal('Error')
      expect(stub.callCount).to.equal(2)
    })
  })
})
