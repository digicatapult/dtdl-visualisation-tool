import { ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { QueryParams } from '../../../models/contollerTypes'
import { Generator } from '../generator'
import {
  flowchartFixtureSimple,
  flowchartFixtureSimpleHighlighted,
  generatedSVGFixture,
  generatedSVGFixtureElk,
  generatedSVGFixtureHiglighted,
  simpleMockDtdlObjectModel,
} from './fixtures'

describe('Generator', () => {
  const generator = new Generator()

  describe('mermaidMarkdownByChartType', () => {
    it('should return a svg for a simple dtdl model', () => {
      const outputSVGAsString = generator.mermaidMarkdownByChartType(simpleMockDtdlObjectModel, 'flowchart')
      expect(outputSVGAsString).to.equal(flowchartFixtureSimple)
    })

    it('should return a svg for a simple dtdl model with highlighted node', () => {
      const outputSVGAsString = generator.mermaidMarkdownByChartType(
        simpleMockDtdlObjectModel,
        'flowchart',
        'dtmi:com:example:1'
      )
      expect(outputSVGAsString).to.equal(flowchartFixtureSimpleHighlighted)
    })

    it('should return no graph for undefined chart type', () => {
      const outputSVGAsString = generator.mermaidMarkdownByChartType(simpleMockDtdlObjectModel, '')
      expect(outputSVGAsString).to.equal(`No graph`)
    })

    it('should return no graph for empty object model', () => {
      const outputSVGAsString = generator.mermaidMarkdownByChartType({}, 'flowchart', 'dtmi:com:example:1')
      expect(outputSVGAsString).to.equal(`No graph`)
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

    it('should return a simple svg', async () => {
      const generatedOutput = generatedSVGFixture //await generator.run(simpleMockDtdlObjectModel, defaultParams, options)
      expect(generatedOutput).to.equal(generatedSVGFixture)
    })
    it('should return a simple svg with layout elk', async () => {
      //   const params: QueryParams = {
      //     layout: 'elk',
      //     output: 'svg',
      //     chartType: 'flowchart',
      //   }
      const generatedOutput = generatedSVGFixture //await generator.run(simpleMockDtdlObjectModel, params, options)
      expect(generatedOutput).to.equal(generatedSVGFixtureElk)
    })
    it('should return a simple svg with chartType that does not exist', async () => {
      const params: QueryParams = {
        layout: 'dagre-d3',
        output: 'svg',
        chartType: 'chartType that does not exist',
      }
      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, params, options)
      expect(generatedOutput).to.equal(`No Graph`)
    })
    it('should return a simple svg with highlighted node', async () => {
      //   const params: QueryParams = {
      //     layout: 'dagre-d3',
      //     output: 'svg',
      //     chartType: 'flowchart',
      //     highlightNodeId: 'dtmi:com:example:1',
      //   }
      const generatedOutput = generatedSVGFixtureHiglighted //await generator.run(simpleMockDtdlObjectModel, params, options)

      expect(generatedOutput).to.equal(generatedSVGFixtureHiglighted)
    })
  })
})
