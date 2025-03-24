import { expect } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { pino } from 'pino'
import puppeteer, { Browser, Page } from 'puppeteer'
import sinon from 'sinon'

import { defaultParams } from '../../../controllers/__tests__/root.test'
import { SvgGenerator } from '../generator'
import { generatedSVGFixture, simpleMockDtdlObjectModel, svgSearchFuelTypeExpandedFossilFuel } from './fixtures'
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

    it('should wait for a render to complete before requesting another', async () => {
      const clock = sinon.useFakeTimers({ shouldAdvanceTime: true })
      const pageRenderStub = sinon.stub().callsFake(async (_container, _mermaidConfig, _definition, _svgId) => {
        if (
          _svgId ===
          'flowchart TD\ndtmi:com:example:1@{ shape: rect, label: "example 1"}\nclick dtmi:com:example:1 getEntity\nclass dtmi:com:example:1 search'
        ) {
          await clock.tickAsync(4000)
          return svgSearchFuelTypeExpandedFossilFuel
        }
        return generatedSVGFixture
      })

      const pageStub = {
        $eval: pageRenderStub,
        on: sinon.stub(),
        goto: sinon.stub().resolves(),
        addScriptTag: sinon.stub().resolves(),
        evaluate: sinon.stub().resolves(),
      } as unknown as Page

      sinon.stub(puppeteer, 'launch').resolves({
        newPage: sinon.stub().resolves(pageStub),
        close: sinon.stub(),
      } as unknown as Browser)

      const gen = new SvgGenerator(logger)
      const [firstResult, secondResult] = await Promise.all([
        gen.run(simpleMockDtdlObjectModel, 'flowchart', 'elk' as const),
        gen.run(simpleMockDtdlObjectModel, 'classDiagram', 'elk' as const),
      ])

      expect(firstResult.renderToString()).to.not.equal(secondResult.renderToString())
    })
  })
})
