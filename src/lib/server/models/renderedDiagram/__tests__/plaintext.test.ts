import { expect } from 'chai'
import { describe } from 'mocha'

import { RenderedDiagram } from '../base.js'
import { PlainTextRender } from '../plaintext.js'

describe('PlaintextRender', function () {
  it('should be a RenderedDiagram', function () {
    const result = new PlainTextRender('foo')
    expect(result).instanceOf(RenderedDiagram)
  })

  it('should have a type of `text`', function () {
    const result = new PlainTextRender('foo')
    expect(result.type).equal('text')
  })

  it('should render content from ctor (foo)', function () {
    const result = new PlainTextRender('foo')
    expect(result.renderToString()).equal('foo')
  })

  it('should render content from ctor (bar)', function () {
    const result = new PlainTextRender('bar')
    expect(result.renderToString()).equal('bar')
  })
})
