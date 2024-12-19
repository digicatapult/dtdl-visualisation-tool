import { expect } from 'chai'
import { describe } from 'mocha'

import { MermaidSvgRender } from '../mermaidSvg.js'
import { parser } from '../parser.js'
import { PlainTextRender } from '../plaintext.js'
import { emptyMermaidSvg1 } from './fixtures.js'

describe('renderOutputsParser', function () {
  it('should parse an svg to a MermaidSvgRender', function () {
    const instance = {
      type: 'svg',
      content: emptyMermaidSvg1,
    }
    const result = parser.parse(instance)
    expect(result).instanceOf(MermaidSvgRender)
  })

  it('should parse text to a PlaintextRender', function () {
    const instance = {
      type: 'text',
      content: 'foo',
    }
    const result = parser.parse(instance)
    expect(result).instanceOf(PlainTextRender)
  })
})
