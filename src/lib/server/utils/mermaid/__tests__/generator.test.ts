import { ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import sinon from 'sinon'
import { defaultParams } from '../../../controllers/__tests__/root.test'
import { SvgGenerator } from '../generator'
import { classDiagramFixtureSimple, flowchartFixtureSimple, simpleMockDtdlObjectModel } from './fixtures'
import { checkIfStringIsSVG } from './helpers'

describe('Generator', function () {
  this.timeout(10000)
  const logger = pino({ level: 'silent' })
  const generator = new SvgGenerator(logger)

  describe('mermaidMarkdownByChartType', () => {
    it('should return a flowchart graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD'
      )
      expect(markdown).to.equal(flowchartFixtureSimple)
    })

    it('should return a classDiagram graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['classDiagram'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD'
      )
      expect(markdown).to.equal(classDiagramFixtureSimple)
    })

    it('should return null for empty object model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown({}, ' TD')
      expect(markdown).to.equal(null)
    })
  })

  describe('run', () => {
    const options: ParseMDDOptions = {
      viewport: {
        width: 120,
        height: 48,
        deviceScaleFactor: 1,
      },
    }

    it('should return no graph for empty object model', async () => {
      const generatedOutput = await generator.run({}, defaultParams.diagramType, defaultParams.layout, options)
      expect(generatedOutput.type).to.equal('text')
      expect(generatedOutput.renderToString()).to.equal(`No graph`)
    })

    it('should return a simple svg', async () => {
      const generatedOutput = await generator.run(
        simpleMockDtdlObjectModel,
        defaultParams.diagramType,
        defaultParams.layout,
        options
      )
      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.renderToString())).to.equal(true)
    })

    it('should retry if an error occurs', async () => {
      const generator = new SvgGenerator(logger)
      const browser = await generator.browser
      const stub = sinon.stub(browser, 'newPage').onFirstCall().rejects('Error').callThrough()

      const generatedOutput = await generator.run(
        simpleMockDtdlObjectModel,
        defaultParams.diagramType,
        defaultParams.layout,
        options
      )

      expect(generatedOutput.type).to.equal('svg')
      expect(checkIfStringIsSVG(generatedOutput.renderToString())).to.equal(true)
      expect(stub.callCount).to.equal(1)
    })
  })
})
