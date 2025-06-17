import { expect } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { pino } from 'pino'
import puppeteer, { Browser } from 'puppeteer'
import sinon from 'sinon'

import { defaultParams } from '../../../controllers/__tests__/root.test'
import { MermaidSvgRender, PlainTextRender } from '../../../models/renderedDiagram'
import { SvgGenerator } from '../generator'
import {
  generatedSVGFixture,
  mockDtdlObjectModel,
  pageMock,
  simpleMockDtdlObjectModel,
  svgSearchFuelTypeExpandedFossilFuel,
} from './fixtures'
import { checkIfStringIsSVG, mockEnvClass } from './helpers'

export const parallelTest = 2
export const nonParallelTest = 1

describe('Generator', function () {
  this.timeout(10000)
  const logger = pino({ level: 'silent' })
  const mockEnv = mockEnvClass()
  const generator = new SvgGenerator(logger, nonParallelTest, mockEnv)

  afterEach(() => {
    sinon.restore()
  })

  describe('run', () => {
    it('should return no graph for empty object model', async () => {
      const generatedOutput = await generator.run({}, defaultParams.diagramType, 'elk' as const)
      expect(generatedOutput.type).to.equal('text')
      expect(generatedOutput.renderToString()).to.equal(`The filtered ontology has no entities to display`)
    })

    it('should return a simple svg', async () => {
      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, defaultParams.diagramType, 'elk' as const)
      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.renderToString())).to.equal(true)
    })

    it('should retry if an error occurs', async () => {
      const stub = sinon.stub(puppeteer, 'launch').onFirstCall().rejects('Error').callThrough()
      const generator = new SvgGenerator(logger, parallelTest, mockEnv)

      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, defaultParams.diagramType, 'elk' as const)

      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.renderToString())).to.equal(true)
      expect(stub.callCount).to.equal(2)
    })

    it('will only retry once', async () => {
      const stub = sinon.stub(puppeteer, 'launch').rejects('Error')
      const generator = new SvgGenerator(logger, parallelTest, mockEnv)

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

      const gen = new SvgGenerator(logger, parallelTest, mockEnv)

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
      const gen = new SvgGenerator(logger, parallelTest, mockEnv)
      const runs: Promise<MermaidSvgRender | PlainTextRender>[] = []
      // render one more ontology than the number of pages available
      for (let i = 0; i < parallelTest + 1; i++) {
        runs.push(gen.run(simpleMockDtdlObjectModel, 'flowchart', 'elk' as const))
      }
      await Promise.all(runs)
      expect(
        startTimes.find((startTime) => {
          return startTime >= 4000
        })
      ).to.not.equal(undefined)
    })
    it('if parallel render fails browser should restart and renders should complete', async () => {
      const clock = sinon.useFakeTimers({ shouldAdvanceTime: true })
      const startTimes: number[] = []
      const pageRenderStub = sinon
        .stub()
        .callsFake(async () => {
          startTimes.push(clock.Date.now())
          await clock.tickAsync(4000)
          return svgSearchFuelTypeExpandedFossilFuel
        })
        .onSecondCall()
        .rejects(new Error('Error'))
      sinon.stub(puppeteer, 'launch').resolves({
        newPage: sinon.stub().resolves(pageMock(pageRenderStub)),
        close: sinon.stub(),
      } as unknown as Browser)
      const gen = new SvgGenerator(logger, parallelTest, mockEnv)
      const runs: Promise<MermaidSvgRender | PlainTextRender>[] = []
      for (let i = 0; i < parallelTest; i++) {
        runs.push(gen.run(simpleMockDtdlObjectModel, 'flowchart', 'elk' as const))
      }
      const results = await Promise.all(runs)
      expect(results.length).to.equal(parallelTest)
      for (const result of results) {
        expect(result.renderToString()).to.equal(svgSearchFuelTypeExpandedFossilFuel)
      }
    })
    it('should not render ontologies larger than the env and return user message', async () => {
      const mockEnvWithLimit = mockEnvClass({ MAX_DTDL_OBJECT_SIZE: 4 })
      const gen = new SvgGenerator(logger, nonParallelTest, mockEnvWithLimit)
      const result = await gen.run(mockDtdlObjectModel, 'flowchart', 'elk' as const)
      expect(result.type).to.equal('text')
      expect(result.renderToString()).to.equal(
        'The ontology opened is too large to be displayed in full. Please filter the size of the ontology by searching within it above'
      )
    })
  })
})
