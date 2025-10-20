/**
 * These tests check that the SVG output of the Mermaid renderer is as expected.
 * They are not exhaustive, but they should catch any major issues with the output and assumptions we're making about their structure.
 * The tests are intentionally somewhat fragile to catch changes in the output that we might not expect.
 */

import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'

import { type MermaidSvgRender, PlainTextRender } from '../../../models/renderedDiagram/index.js'
import { SvgGenerator } from '../generator.js'
import { mockDtdlObjectModel } from './fixtures.js'
import { nonParallelTest } from './generator.test.js'
import { expectStringIsFiniteNumber, getChildrenByClass, mockEnvClass } from './helpers.js'

describe('Mermaid Invariants', function () {
  describe('flowchart', function () {
    let mermaidRender: MermaidSvgRender

    before(async () => {
      const logger = pino({ level: 'silent' })
      const env = mockEnvClass()
      const generator = new SvgGenerator(logger, nonParallelTest, env)
      const render = await generator.run(mockDtdlObjectModel, 'flowchart', 'elk')
      if (render instanceof PlainTextRender) {
        expect.fail('Expected a MermaidSvgRender')
      }
      mermaidRender = render
    })

    it('should set a viewBox with a width and height that are valid positive numbers', function () {
      const size = mermaidRender.svgRawSize
      expect(size?.width).be.greaterThan(0)
      expect(size?.height).be.greaterThan(0)
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
        'L_dtmi:com:example:1_dtmi:com:example_related:1_0_0',
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
        ['L_dtmi:com:example:1_dtmi:com:example_related:1_0_0', 'A'],
      ])
    })

    it('should have a class of flowchart', function () {
      const svg = mermaidRender.svgElement
      const classList = new Set(svg.classList.toString().split(/\s+/))
      expect(classList.has('flowchart')).to.equal(true)
    })

    it('should have a `rect` within the `g` elements of class `node`', function () {
      const svg = mermaidRender.svgElement
      const nodes = [...svg.querySelectorAll('g.node')]

      expect(nodes.length).to.equal(3)

      const rects = nodes.map((n) => [...n.childNodes].filter((c) => 'tagName' in c && c.tagName === 'rect').length)
      expect(rects).to.deep.equal([1, 1, 1])
    })

    it('should have a g with class edges', function () {
      const svg = mermaidRender.svgElement
      const edges = [...svg.querySelectorAll('g.edges')]

      expect(edges.length).to.equal(1)
    })

    it('should have two path children in g.edges', function () {
      const svg = mermaidRender.svgElement
      const edges = [...svg.querySelectorAll('g.edges')]
      const paths = edges.map((n) => [...n.childNodes].filter((c) => 'tagName' in c && c.tagName === 'path').length)

      expect(paths).to.deep.equal([2])
    })

    it('should have a g with class edgePaths', function () {
      const svg = mermaidRender.svgElement
      const edges = [...svg.querySelectorAll('g.edgeLabels')]

      expect(edges.length).to.equal(1)
    })

    it('should have two path children in g.edgePaths', function () {
      const svg = mermaidRender.svgElement
      const edgePaths = [...svg.querySelectorAll('g.edgePaths')]
      const paths = edgePaths.map((n) => [...n.childNodes].filter((c) => 'tagName' in c && c.tagName === 'path').length)

      expect(paths).to.deep.equal([2])
    })

    it('should have a g with class edgeLabel for each edge', function () {
      const svg = mermaidRender.svgElement
      const edges = [...svg.querySelectorAll('g.edgeLabel')]

      expect(edges.length).to.equal(2)
    })

    it('should have some .text-inner-tspan within each .edgeLabel', function () {
      const svg = mermaidRender.svgElement
      const labels = [...svg.querySelectorAll('g.edgeLabel')]
      const textSpans = labels.map((n) => [...n.querySelectorAll('.text-inner-tspan')].length)
      expect(textSpans).to.deep.equal([1, 2])
    })

    it('should have a rect background within each label', function () {
      const svg = mermaidRender.svgElement
      const edgeLabels = svg.querySelectorAll('g.edgeLabel')
      //asserting there are two edge labels before checking their contents
      expect(edgeLabels.length).to.equal(2)
      edgeLabels.forEach((edgeLabel) => {
        const labels = edgeLabel.querySelectorAll('.label')
        //asserting there is one label within each edge label
        expect(labels.length).to.equal(1)
        labels.forEach((label) => {
          //asserting there is one rect within each label
          expect(label.querySelectorAll('rect').length).to.equal(1)
        })
      })
    })

    it('should contain marker elements within the svg', function () {
      const svg = mermaidRender.svgElement
      const markers = [...svg.querySelectorAll('.marker')]
      expect(markers.length).to.equal(6)
    })
  })

  describe('classDiagram', function () {
    let mermaidRender: MermaidSvgRender

    before(async () => {
      const logger = pino({ level: 'silent' })
      const env = mockEnvClass()
      const generator = new SvgGenerator(logger, nonParallelTest, env)
      const render = await generator.run(mockDtdlObjectModel, 'classDiagram', 'elk')
      if (render instanceof PlainTextRender) {
        expect.fail('Expected a MermaidSvgRender')
      }
      mermaidRender = render
    })

    it('should set a viewBox with a width and height that are valid positive numbers', function () {
      const size = mermaidRender.svgRawSize
      expect(size?.width).be.greaterThan(0)
      expect(size?.height).be.greaterThan(0)
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

    it('should have a class of classDiagram', function () {
      const svg = mermaidRender.svgElement
      const classList = new Set(svg.classList.toString().split(/\s+/))
      expect(classList.has('classDiagram')).to.equal(true)
    })

    it('should have a .label-container within the `g` elements of class `node`', function () {
      const svg = mermaidRender.svgElement
      const nodes = [...svg.querySelectorAll('g.node')]

      expect(nodes.length).to.equal(3)

      const paths = nodes.map((n) => getChildrenByClass(n, 'label-container').length)
      expect(paths).to.deep.equal([1, 1, 1])
    })

    it('should have a .divider within the `g` elements of class `node`', function () {
      const svg = mermaidRender.svgElement
      const nodes = [...svg.querySelectorAll('g.node')]

      expect(nodes.length).to.equal(3)

      const paths = nodes.map((n) => getChildrenByClass(n, 'label-container').length)
      expect(paths).to.deep.equal([1, 1, 1])
    })

    it('should have two paths within each .label-container', function () {
      const svg = mermaidRender.svgElement
      const nodes = [...svg.querySelectorAll('g.node > .label-container')]
      const paths = nodes.map((n) => [...n.childNodes].filter((c) => 'tagName' in c && c.tagName === 'path').length)
      expect(paths).to.deep.equal([2, 2, 2])
    })

    it('should have a path within each .divider', function () {
      const svg = mermaidRender.svgElement
      const nodes = [...svg.querySelectorAll('g.node > .divider')]
      const paths = nodes.map((n) => [...n.childNodes].filter((c) => 'tagName' in c && c.tagName === 'path').length)
      expect(paths).to.deep.equal([1, 1, 1, 1, 1, 1])
    })

    it('should have a g with class edges', function () {
      const svg = mermaidRender.svgElement
      const edges = [...svg.querySelectorAll('g.edges')]

      expect(edges.length).to.equal(1)
    })

    it('should have two path children in g.edges', function () {
      const svg = mermaidRender.svgElement
      const edges = [...svg.querySelectorAll('g.edges')]
      const paths = edges.map((n) => [...n.childNodes].filter((c) => 'tagName' in c && c.tagName === 'path').length)

      expect(paths).to.deep.equal([2])
    })

    it('should have a g with class edgePaths', function () {
      const svg = mermaidRender.svgElement
      const edges = [...svg.querySelectorAll('g.edgeLabels')]

      expect(edges.length).to.equal(1)
    })

    it('should have two path children in g.edgePaths', function () {
      const svg = mermaidRender.svgElement
      const edgePaths = [...svg.querySelectorAll('g.edgePaths')]
      const paths = edgePaths.map((n) => [...n.childNodes].filter((c) => 'tagName' in c && c.tagName === 'path').length)

      expect(paths).to.deep.equal([2])
    })

    it('should have a g with class edgeLabel for each edge', function () {
      const svg = mermaidRender.svgElement
      const edges = [...svg.querySelectorAll('g.edgeLabel')]

      expect(edges.length).to.equal(2)
    })

    it('should have some .text-inner-tspan within each .edgeLabel', function () {
      const svg = mermaidRender.svgElement
      const labels = [...svg.querySelectorAll('g.edgeLabel')]
      const textSpans = labels.map((n) => [...n.querySelectorAll('.text-inner-tspan')].length)
      expect(textSpans).to.deep.equal([1, 2])
    })

    it('should have a rect background within each label', function () {
      const svg = mermaidRender.svgElement
      const edgeLabels = svg.querySelectorAll('g.edgeLabel')
      expect(edgeLabels.length).to.equal(2)
      edgeLabels.forEach((edgeLabel) => {
        const labels = edgeLabel.querySelectorAll('.label')
        labels.forEach((label) => {
          expect(label.querySelectorAll('rect').length).to.equal(1)
        })
      })
    })

    it('should contain marker elements within the svg', function () {
      const svg = mermaidRender.svgElement
      const markers = [...svg.querySelectorAll('.marker')]
      expect(markers.length).to.equal(10)
    })
  })
})
