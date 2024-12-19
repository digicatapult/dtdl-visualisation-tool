import { expect } from 'chai'
import { describe, it } from 'mocha'

import { RenderedDiagram } from '../base.js'

describe('RenderedDiagram', function () {
  describe('toJSON', function () {
    it('should render based on the type and renderToString method (text, foo)', function () {
      class Test extends RenderedDiagram<'text'> {
        get type() {
          return 'text' as const
        }
        renderToString() {
          return 'foo'
        }
      }
      const instance = new Test()
      expect(JSON.stringify(instance)).to.equal(JSON.stringify({ type: 'text', content: 'foo' }))
    })

    it('should render based on the type and renderToString method (svg, bar)', function () {
      class Test extends RenderedDiagram<'svg'> {
        get type() {
          return 'svg' as const
        }
        renderToString() {
          return 'bar'
        }
      }
      const instance = new Test()
      expect(JSON.stringify(instance)).to.equal(JSON.stringify({ type: 'svg', content: 'bar' }))
    })
  })
})
