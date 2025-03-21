import { expect } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { pino } from 'pino'
import puppeteer from 'puppeteer'
import sinon from 'sinon'

import { defaultParams } from '../../../controllers/__tests__/root.test'
import { SvgGenerator } from '../generator'
import { generatedSVGFixture, simpleMockDtdlObjectModel } from './fixtures'
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
      const generatedOutput = await generator.run({}, defaultParams.diagramType, 'elk' as const)
      expect(generatedOutput.type).to.equal('text')
      expect(generatedOutput.renderToString()).to.equal(`No graph`)
    })

    it('should return a simple svg', async () => {
      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, defaultParams.diagramType, 'elk' as const)
      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.renderToString())).to.equal(true)
    })

    it('should retry if an error occurs', async () => {
      const stub = sinon.stub(puppeteer, 'launch').onFirstCall().rejects('Error').callThrough()
      const generator = new SvgGenerator(logger)

      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, defaultParams.diagramType, 'elk' as const)

      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.renderToString())).to.equal(true)
      expect(stub.callCount).to.equal(2)
    })

    it('will only retry once', async () => {
      const stub = sinon.stub(puppeteer, 'launch').rejects('Error')
      const generator = new SvgGenerator(logger)

      let error: Error | null = null
      try {
        await generator.run(simpleMockDtdlObjectModel, defaultParams.diagramType, 'elk' as const)
      } catch (err) {
        error = err as Error
      }

      expect(error?.name).to.equal('Error')
      expect(stub.callCount).to.equal(2)
    })

    it('should wait for a render to complete if before requesting another', async () => {
      let firstRenderStartTime: number = 0
      let secondRenderStartTime: number = 0
      const PageRenderStub = sinon.stub()

      PageRenderStub.callsFake(async (_container, _mermaidConfig, _definition, _svgId) => {
        // differentiating different calls to render from diagram type and marking start time
        if (
          _svgId ===
          'flowchart TD\ndtmi:com:example:1@{ shape: rect, label: "example 1"}\nclick dtmi:com:example:1 getEntity\nclass dtmi:com:example:1 search'
        )
          firstRenderStartTime = Date.now()
        else secondRenderStartTime = Date.now()
        await new Promise((resolve) => setTimeout(resolve, 4000))
        return generatedSVGFixture
      })
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      sinon.stub(generator as any, 'init').get(() => ({
        page: { $eval: PageRenderStub },
      }))

      const firstCall = generator.run(simpleMockDtdlObjectModel, 'flowchart', 'elk' as const)
      const secondCall = generator.run(simpleMockDtdlObjectModel, 'classDiagram', 'elk' as const)

      await Promise.all([firstCall, secondCall])

      expect(firstRenderStartTime).to.not.equal(0)
      expect(secondRenderStartTime).to.not.equal(0)

      // If the start times difference is greater than the delay, we know the mutex worked. when removing the mutex this test should fail
      expect(secondRenderStartTime).to.be.greaterThanOrEqual(firstRenderStartTime + 4000)
    })
  })
})
