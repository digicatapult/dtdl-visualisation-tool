import { ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { defaultParams } from '../../../controllers/__tests__/root.test'
import { QueryParams } from '../../../models/contollerTypes'
import { SvgGenerator } from '../generator'
import {
  flowchartFixtureSimple,
  flowchartFixtureSimpleHighlighted,
  generatedSVGFixture,
  generatedSVGFixtureElk,
  generatedSVGFixtureHiglighted,
  simpleMockDtdlObjectModel,
} from './fixtures'

describe('Generator', () => {
  const generator = new SvgGenerator()

  describe('mermaidMarkdownByChartType', () => {
    it('should return a svg for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByChartType['flowchart'](simpleMockDtdlObjectModel)
      expect(markdown).to.equal(flowchartFixtureSimple)
    })

    it('should return a svg for a simple dtdl model with highlighted node', () => {
      const markdown = generator.mermaidMarkdownByChartType['flowchart'](
        simpleMockDtdlObjectModel,
        'dtmi:com:example:1'
      )
      expect(markdown).to.equal(flowchartFixtureSimpleHighlighted)
    })

    it('should return null for empty object model', () => {
      const markdown = generator.mermaidMarkdownByChartType['flowchart']({}, 'dtmi:com:example:1')
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
      const generatedOutput = await generator.run({}, defaultParams, options)
      expect(generatedOutput).to.equal(`No graph`)
    })

    it.skip('should return a simple svg', async () => {
      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, defaultParams, options)
      expect(generatedOutput).to.equal(generatedSVGFixture)
    })
    it.skip('should return a simple svg with layout elk', async () => {
      const params: QueryParams = {
        layout: 'elk',
        output: 'svg',
        chartType: 'flowchart',
      }
      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, params, options)
      expect(generatedOutput).to.equal(generatedSVGFixtureElk)
    })
    it.skip('should return a simple svg with highlighted node', async () => {
      const params: QueryParams = {
        layout: 'dagre-d3',
        output: 'svg',
        chartType: 'flowchart',
        highlightNodeId: 'dtmi:com:example:1',
      }
      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, params, options)

      expect(generatedOutput).to.equal(generatedSVGFixtureHiglighted)
    })
  })
})
