import { ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { defaultParams } from '../../../controllers/__tests__/root.test'
import { SvgGenerator } from '../generator'
import {
  classDiagramFixtureSimple,
  classDiagramFixtureSimpleHighlighted,
  flowchartFixtureSimple,
  flowchartFixtureSimpleHighlighted,
  simpleMockDtdlObjectModel,
} from './fixtures'
import { checkIfStringIsSVG } from './helpers'

describe('Generator', () => {
  const generator = new SvgGenerator()

  describe('mermaidMarkdownByChartType', () => {
    it('should return a flowchart graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD'
      )
      expect(markdown).to.equal(flowchartFixtureSimple)
    })

    it('should return a flowchart graph for a simple dtdl model with highlighted node', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD',
        'dtmi:com:example:1'
      )
      expect(markdown).to.equal(flowchartFixtureSimpleHighlighted)
    })

    it('should return a classDiagram graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['classDiagram'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD'
      )
      expect(markdown).to.equal(classDiagramFixtureSimple)
    })

    it('should return a classDiagram graph for a simple dtdl model with highlighted node', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['classDiagram'].generateMarkdown(
        simpleMockDtdlObjectModel,
        ' TD',
        'dtmi:com:example:1'
      )
      expect(markdown).to.equal(classDiagramFixtureSimpleHighlighted)
    })

    it('should return null for empty object model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        {},
        ' TD',
        'dtmi:com:example:1'
      )
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

    it('should return a simple svg', async () => {
      const generatedOutput = await generator.run(simpleMockDtdlObjectModel, defaultParams, options)
      expect(checkIfStringIsSVG(generatedOutput)).to.equal(true)
    })
  })

  describe('getMermaidIdFromNodeId', () => {
    it('should return a mermaidId from a svg node id', () => {
      const svgNodeId = 'flowchart-dtmi:com:example:1-1'
      expect(generator.getMermaidIdFromNodeId(svgNodeId)).to.equal('dtmi:com:example:1')
    })
    it('should return a null from a string that does not match the regex pattern', () => {
      const nonMatchingString = 'dtmi:com:example:1'
      expect(generator.getMermaidIdFromNodeId(nonMatchingString)).to.equal(null)
    })
  })

  describe('setSVGAttributes', () => {
    it('should return a html string with added attributes', () => {
      const controlStringElement = '<div id="mermaid-svg"/>'
      const testElement = '<div id="mermaid-svg" hx-include="#search-panel"/>'
      expect(generator.setSVGAttributes(controlStringElement)).to.equal(testElement)
    })

    it('should throw an internal error if given svg string does not have id mermaid-svg', () => {
      const controlStringElement = '<div id="not-mermaid-svg"/>'
      expect(() => {
        generator.setSVGAttributes(controlStringElement)
      })
        .to.throw('Error in finding mermaid-svg Element in generated output')
        .with.property('code', 501)
    })
  })
})
