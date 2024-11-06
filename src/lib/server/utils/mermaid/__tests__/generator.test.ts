import { ParseMDDOptions } from '@mermaid-js/mermaid-cli'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { defaultParams } from '../../../controllers/__tests__/root.test'
import { SvgGenerator } from '../generator'
import {
  classDiagramFixtureSimple,
  classDiagramFixtureSimpleHighlighted,
  emptyModel,
  flowchartFixtureSimple,
  flowchartFixtureSimpleHighlighted,
  simpleDtdlModelWithMetadata,
} from './fixtures'
import { checkIfStringIsSVG } from './helpers'

describe('Generator', () => {
  const generator = new SvgGenerator()

  describe('mermaidMarkdownByChartType', () => {
    it('should return a flowchart graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        simpleDtdlModelWithMetadata,
        ' TD'
      )
      expect(markdown).to.equal(flowchartFixtureSimple)
    })

    it('should return a flowchart graph for a simple dtdl model with highlighted node', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        simpleDtdlModelWithMetadata,
        ' TD',
        'dtmi:com:example:1'
      )
      expect(markdown).to.equal(flowchartFixtureSimpleHighlighted)
    })

    it('should return a classDiagram graph for a simple dtdl model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['classDiagram'].generateMarkdown(
        simpleDtdlModelWithMetadata,
        ' TD'
      )
      expect(markdown).to.equal(classDiagramFixtureSimple)
    })

    it('should return a classDiagram graph for a simple dtdl model with highlighted node', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['classDiagram'].generateMarkdown(
        simpleDtdlModelWithMetadata,
        ' TD',
        'dtmi:com:example:1'
      )
      expect(markdown).to.equal(classDiagramFixtureSimpleHighlighted)
    })

    it('should return null for empty object model', () => {
      const markdown = generator.mermaidMarkdownByDiagramType['flowchart'].generateMarkdown(
        emptyModel,
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
      const generatedOutput = await generator.run(emptyModel, defaultParams, options)
      expect(generatedOutput).to.equal(`No graph`)
    })

    it('should return a simple svg', async () => {
      const generatedOutput = await generator.run(simpleDtdlModelWithMetadata, defaultParams, options)
      expect(checkIfStringIsSVG(generatedOutput)).to.equal(true)
    })
  })
})
