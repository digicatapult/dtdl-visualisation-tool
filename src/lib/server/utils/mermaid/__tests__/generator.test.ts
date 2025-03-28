import { expect } from 'chai'
import { afterEach, describe, it } from 'mocha'
import os from 'node:os'
import { pino } from 'pino'
import puppeteer, { Browser } from 'puppeteer'
import sinon from 'sinon'

import { defaultParams } from '../../../controllers/__tests__/root.test'
import { MermaidSvgRender, PlainTextRender } from '../../../models/renderedDiagram'
import { SvgGenerator } from '../generator'
import {
  generatedSVGFixture,
  pageMock,
  simpleMockDtdlObjectModel,
  svgSearchFuelTypeExpandedFossilFuel,
} from './fixtures'
import { checkIfStringIsSVG } from './helpers'

describe('Generator', function () {
  this.timeout(1000000)
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
    it('should render two ontologies in parallel', async () => {
      const clock = sinon.useFakeTimers({ shouldAdvanceTime: true })
      let firstCallStartTime = 0
      let secondCallStartTime = 0
      const pageRenderStub = sinon.stub().callsFake(async (_container, _mermaidConfig, _definition, _svgId) => {
        if (
          _svgId ===
          'flowchart TD\ndtmi:com:example:1@{ shape: rect, label: "example 1"}\nclick dtmi:com:example:1 getEntity\nclass dtmi:com:example:1 search'
        ) {
          firstCallStartTime = clock.Date.now()
          await clock.tickAsync(4000)
          return svgSearchFuelTypeExpandedFossilFuel
        }
        secondCallStartTime = clock.Date.now()
        return generatedSVGFixture
      })

      sinon.stub(puppeteer, 'launch').resolves({
        newPage: sinon.stub().resolves(pageMock(pageRenderStub)),
        close: sinon.stub(),
      } as unknown as Browser)

      const gen = new SvgGenerator(logger)

      const [firstResult, secondResult] = await Promise.all([
        gen.run(simpleMockDtdlObjectModel, 'flowchart', 'elk' as const),
        gen.run(simpleMockDtdlObjectModel, 'classDiagram', 'elk' as const),
      ])
      expect(secondCallStartTime).to.not.be.greaterThan(firstCallStartTime + 10)
      expect(firstResult.renderToString()).to.not.equal(secondResult.renderToString())
    })
    it('should render multiple ontologies and queue one', async () => {
      const clock = sinon.useFakeTimers({ shouldAdvanceTime: true })
      const startTimes: number[] = []
      const pageRenderStub = sinon.stub().callsFake(async () => {
        startTimes.push(clock.Date.now())
        await clock.tickAsync(4000)
        return svgSearchFuelTypeExpandedFossilFuel
      })
      sinon.stub(puppeteer, 'launch').resolves({
        newPage: sinon.stub().resolves(pageMock(pageRenderStub)),
        close: sinon.stub(),
      } as unknown as Browser)
      const gen = new SvgGenerator(logger)
      const runs: Promise<MermaidSvgRender | PlainTextRender>[] = []
      const numPages = os.cpus().length - 2
      // render one more ontology than the number of pages available
      for (let i = 0; i < numPages + 1; i++) {
        runs.push(gen.run(simpleMockDtdlObjectModel, 'flowchart', 'elk' as const))
      }
      await Promise.all(runs)
      expect(
        startTimes.find((startTime) => {
          return startTime >= 4000
        })
      ).to.not.equal(undefined)
    })
    it.only('if parallel render fails browser should restart and renders should complete', async () => {
      const clock = sinon.useFakeTimers({ shouldAdvanceTime: true })
      const startTimes: number[] = []
      const numPages = os.cpus().length - 2
      let callNumber = 0
      let failedOnce = false
      const failOnRun = Math.floor(Math.random() * numPages)
      const pageRenderStub = sinon.stub().callsFake(async () => {
        callNumber++
        if (!failedOnce && callNumber == failOnRun) {
          failedOnce = true
          throw new Error('random fail event')
        }
        startTimes.push(clock.Date.now())
        await clock.tickAsync(4000)
        return svgSearchFuelTypeExpandedFossilFuel
      })
      sinon.stub(puppeteer, 'launch').resolves({
        newPage: sinon.stub().resolves(pageMock(pageRenderStub)),
        close: sinon.stub(),
      } as unknown as Browser)
      const gen = new SvgGenerator(logger)
      const runs: Promise<MermaidSvgRender | PlainTextRender>[] = []
      // render one more ontology than the number of pages available
      for (let i = 0; i < numPages; i++) {
        runs.push(gen.run(simpleMockDtdlObjectModel, 'flowchart', 'elk' as const))
      }
      const results = await Promise.all(runs)
      expect(results.length).to.equal(numPages)
      for (const result of results) {
        expect(result.renderToString()).to.equal(svgSearchFuelTypeExpandedFossilFuel)
      }
    })
  })
})
