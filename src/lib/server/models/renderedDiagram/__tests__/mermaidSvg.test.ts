import { expect } from 'chai'
import { describe } from 'mocha'
import sinon from 'sinon'

import { InternalError } from '../../../errors.js'
import { MermaidSvgRender } from '../mermaidSvg.js'

describe('MermaidSvgRender', function () {
  describe('ctor', function () {
    it("throws if content isn't an svg", function () {
      const svgBuffer = Buffer.from('foo')
      expect(() => new MermaidSvgRender(svgBuffer)).to.throw(InternalError)
    })
    it("throws if content doesn\'t contain a nodes class element", function () {
      const svgBuffer = Buffer.from('<svg><g class="edges"/><g class="edgeLabels"/></svg>')
      expect(() => new MermaidSvgRender(svgBuffer)).to.throw(InternalError)
    })
    it("throws if content doesn\'t contain an edges or edgePaths class element", function () {
      const svgBuffer = Buffer.from('<svg><g class="nodes"/><g class="edgeLabels"/></svg>')
      expect(() => new MermaidSvgRender(svgBuffer)).to.throw(InternalError)
    })
    it("throws if content doesn\'t contain an edgeLabels class element", function () {
      const svgBuffer = Buffer.from('<svg><g class="edges"/><g class="edgeLabels"/></svg>')
      expect(() => new MermaidSvgRender(svgBuffer)).to.throw(InternalError)
    })
    it('throws if edges and edgeLabels have different child counts', function () {
      const svgBuffer = Buffer.from('<svg><g class="nodes"/><g class="edges"/><g class="edgeLabels"><g/></g></svg>')
      expect(() => new MermaidSvgRender(svgBuffer)).to.throw(InternalError)
    })
    it('should return an instance with edges', function () {
      const svgBuffer = Buffer.from('<svg><g class="nodes"/><g class="edges"/><g class="edgeLabels"/></svg>')
      expect(new MermaidSvgRender(svgBuffer)).instanceOf(MermaidSvgRender)
    })
    it('should return an instance with edgePaths', function () {
      const svgBuffer = Buffer.from('<svg><g class="nodes"/><g class="edgePaths"/><g class="edgeLabels"/></svg>')
      expect(new MermaidSvgRender(svgBuffer)).instanceOf(MermaidSvgRender)
    })
  })

  describe('mapGraphNodes', function () {
    const svgBuffer = Buffer.from(
      '<svg><g class="nodes"><g id="foo"/><g id="bar"/></g><g class="edges"/><g class="edgeLabels"/></svg>'
    )

    it('should call function for edge child of nodes element', function () {
      const stub = sinon.stub()
      const instance = new MermaidSvgRender(svgBuffer)

      instance.mapGraphNodes(stub)

      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args[0].id).deep.equal('foo')
      expect(stub.firstCall.args[1]).deep.equal(0)
      expect(stub.firstCall.args[2]).deep.equal(instance)
      expect(stub.secondCall.args[0].id).deep.equal('bar')
      expect(stub.secondCall.args[1]).deep.equal(1)
      expect(stub.secondCall.args[2]).deep.equal(instance)
    })

    it('should return results from each function call', function () {
      const stub = sinon.stub().callsFake((x) => x.id)
      const instance = new MermaidSvgRender(svgBuffer)

      const result = instance.mapGraphNodes(stub)
      expect(result).to.deep.equal(['foo', 'bar'])
    })
  })

  describe('mapGraphEdges', function () {
    const svgBuffer = Buffer.from(
      '<svg><g class="nodes"></g><g class="edges"><g id="foo"/><g id="bar"/></g><g class="edgeLabels"><g id="foo-label"/><g id="bar-label"/></g></svg>'
    )

    it('should call function for edge child of nodes element', function () {
      const stub = sinon.stub()
      const instance = new MermaidSvgRender(svgBuffer)

      instance.mapGraphEdges(stub)

      expect(stub.callCount).to.equal(2)

      expect(stub.firstCall.args[0].id).deep.equal('foo')
      expect(stub.firstCall.args[1].id).deep.equal('foo-label')
      expect(stub.firstCall.args[2]).deep.equal(0)
      expect(stub.firstCall.args[3]).deep.equal(instance)

      expect(stub.secondCall.args[0].id).deep.equal('bar')
      expect(stub.secondCall.args[1].id).deep.equal('bar-label')
      expect(stub.secondCall.args[2]).deep.equal(1)
      expect(stub.secondCall.args[3]).deep.equal(instance)
    })

    it('should return results from each function call', function () {
      const stub = sinon.stub().callsFake((x, y) => [x.id, y.id])
      const instance = new MermaidSvgRender(svgBuffer)

      const result = instance.mapGraphEdges(stub)
      expect(result).to.deep.equal([
        ['foo', 'foo-label'],
        ['bar', 'bar-label'],
      ])
    })
  })
})
