import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'

import { type MermaidSvgRender, PlainTextRender } from '../../../models/renderedDiagram/index.js'
import { SvgGenerator } from '../generator.js'
import { mockDtdlObjectModel } from './fixtures.js'
import { expectStringIsFiniteNumber } from './helpers.js'

describe('Mermaid Invariants', function () {
  describe('flowchart', function () {
    let mermaidRender: MermaidSvgRender

    before(async () => {
      const logger = pino({ level: 'silent' })
      const generator = new SvgGenerator(logger)
      const render = await generator.run(mockDtdlObjectModel, 'flowchart', 'elk')
      if (render instanceof PlainTextRender) {
        expect.fail('Expected a MermaidSvgRender')
      }
      mermaidRender = render
    })

    it('should set element ids based on node ids', function () {
      const ids = mermaidRender.mapGraphNodes((node) => node.id).sort()
      expect(ids).to.deep.equal([
        'flowchart-dtmi:com:example:1-0',
        'flowchart-dtmi:com:example_extended:1-2',
        'flowchart-dtmi:com:example_related:1-6',
      ])
    })

    it('should have set classList on all nodes', function () {
      const classLists = mermaidRender.mapGraphNodes((n) => [...new Set(n.classList.toString().split(/\s+/).sort())])
      expect(classLists).to.deep.equal([
        ['clickable', 'default', 'node', 'search'],
        ['clickable', 'default', 'node', 'search'],
        ['clickable', 'default', 'node', 'search'],
      ])
    })

    it('should transform each node', function () {
      const firstNode = mermaidRender.mapGraphNodes((n) => n)[0]
      const transformAttr = firstNode.getAttribute('transform') || ''
      expect(transformAttr).to.match(/translate\(\s*([-\d.]+)[ ,\s]*([-\d.]+)\s*\)/)
    })

    it('should place a rect within each node as the first child', function () {
      const firstNode = mermaidRender.mapGraphNodes((n) => n)[0]
      const rect = firstNode.childNodes[0] as Element

      expect(rect.tagName).to.equal('rect')
      expectStringIsFiniteNumber(rect.getAttribute('x'))
      expectStringIsFiniteNumber(rect.getAttribute('y'))
      expectStringIsFiniteNumber(rect.getAttribute('width'))
      expectStringIsFiniteNumber(rect.getAttribute('height'))
    })

    it('should set edge ids as expected', function () {
      const pairs = mermaidRender.mapGraphEdges((edge) => edge.id || '').sort()

      expect(pairs).to.deep.equal([
        'L_dtmi:com:example:1_dtmi:com:example_extended:1_0_0',
        'L_dtmi:com:example:1_dtmi:com:example_related:1_1_0',
      ])
    })

    it('should set edge labels correctly', function () {
      const pairs = mermaidRender
        .mapGraphEdges((_edge, label) => label.querySelector('.text-inner-tspan')?.innerHTML || '')
        .sort((a, b) => a.localeCompare(b))

      expect(pairs).to.deep.equal(['A', 'extends'])
    })

    it('should pair edges with labels correctly', function () {
      const pairs = mermaidRender
        .mapGraphEdges((edge, label) => [edge.id || '', label.querySelector('.text-inner-tspan')?.innerHTML || ''])
        .sort((a, b) => a[0].localeCompare(b[0]))

      expect(pairs).to.deep.equal([
        ['L_dtmi:com:example:1_dtmi:com:example_extended:1_0_0', 'extends'],
        ['L_dtmi:com:example:1_dtmi:com:example_related:1_1_0', 'A'],
      ])
    })
  })

  describe('classDiagram', function () {
    let mermaidRender: MermaidSvgRender

    before(async () => {
      const logger = pino({ level: 'silent' })
      const generator = new SvgGenerator(logger)
      const render = await generator.run(mockDtdlObjectModel, 'classDiagram', 'elk')
      if (render instanceof PlainTextRender) {
        expect.fail('Expected a MermaidSvgRender')
      }
      mermaidRender = render
    })

    it('should set element ids based on node ids', function () {
      const ids = mermaidRender.mapGraphNodes((node) => node.id).sort()
      expect(ids).to.deep.equal([
        'classId-dtmi:com:example:1-0',
        'classId-dtmi:com:example_extended:1-1',
        'classId-dtmi:com:example_related:1-2',
      ])
    })

    it('should have set classList on all nodes', function () {
      const classLists = mermaidRender.mapGraphNodes((n) => [...new Set(n.classList.toString().split(/\s+/).sort())])
      expect(classLists).to.deep.equal([
        ['clickable', 'default', 'node', 'search'],
        ['clickable', 'default', 'node', 'search'],
        ['clickable', 'default', 'node', 'search'],
      ])
    })

    it('should transform each node', function () {
      const firstNode = mermaidRender.mapGraphNodes((n) => n)[0]
      const transformAttr = firstNode.getAttribute('transform') || ''
      expect(transformAttr).to.match(/translate\(\s*([-\d.]+)[ ,\s]*([-\d.]+)\s*\)/)
    })

    it('should place a path within each node as the first child of the `label-container`', function () {
      const firstNode = mermaidRender.mapGraphNodes((n) => n)[0]
      const path = firstNode.querySelector('.label-container > path:first-child')

      expect(path).to.not.equal(null)
      const dAttr = path?.getAttribute('d')
      expect(dAttr).to.match(/[ML](?:(-{0,1}\d+(?:\.\d+){0,1})\s+(-{0,1}\d+(?:\.\d+){0,1}))/g)
    })

    it('should set edge ids as expected', function () {
      const pairs = mermaidRender.mapGraphEdges((edge) => edge.id || '').sort()

      expect(pairs).to.deep.equal([
        'id_dtmi:com:example:1_dtmi:com:example_related:1_2_0',
        'id_dtmi:com:example_extended:1_dtmi:com:example:1_1_0',
      ])
    })

    it('should set edge labels correctly', function () {
      const pairs = mermaidRender
        .mapGraphEdges((_edge, label) => label.querySelector('.text-inner-tspan')?.innerHTML || '')
        .sort((a, b) => a.localeCompare(b))

      expect(pairs).to.deep.equal(['A', 'extends'])
    })

    it('should pair edges with labels correctly', function () {
      const pairs = mermaidRender
        .mapGraphEdges((edge, label) => [edge.id || '', label.querySelector('.text-inner-tspan')?.innerHTML || ''])
        .sort((a, b) => a[0].localeCompare(b[0]))

      expect(pairs).to.deep.equal([
        ['id_dtmi:com:example_extended:1_dtmi:com:example:1_1_0', 'extends'],
        ['id_dtmi:com:example:1_dtmi:com:example_related:1_2_0', 'A'],
      ])
    })
  })
})
