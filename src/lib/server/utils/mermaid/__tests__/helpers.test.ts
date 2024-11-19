import { expect } from 'chai'
import { dtdlIdReinstateSemicolon, dtdlIdReplaceSemicolon, setElementAttributes } from '../helpers'
import { JSDOM } from 'jsdom'

describe('Helpers', () => {
  describe('Replacing and reinstating semicolon', () => {
    it('should replace the final semicolon in DTDL ID', () => {
      expect(dtdlIdReplaceSemicolon('dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal;1')).to.equal(
        'dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal:1'
      )
    })
    it('should replace the final semicolon in DTDL ID with any number after the final semicolon', () => {
      expect(dtdlIdReplaceSemicolon('dtmi:com:example;12345')).to.equal('dtmi:com:example:12345')
    })
    it('should replace the final colon in a mermaid safe ID', () => {
      expect(dtdlIdReinstateSemicolon('dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal:1')).to.equal(
        'dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal;1'
      )
    })
    it('should replace the final colon in in a mermaid safe ID with any number after the final colon', () => {
      expect(dtdlIdReinstateSemicolon('dtmi:com:example:12345')).to.equal('dtmi:com:example;12345')
    })
  })
  describe('setNodeAttributes', () => {
    let dom: JSDOM, document: Document

    beforeEach(() => {
      dom = new JSDOM()
      document = dom.window.document
    })

    it('should return an element with htmx attributes', () => {
      const element = document.createElement('div')
      element.id = 'flowchart-dtmi:com:example:1-1'
      element.classList.add('unexpanded')

      setElementAttributes(element, {

      })

      expect(element.getAttribute('hx-get')).to.equal('/update-layout')
      expect(element.getAttribute('hx-target')).to.equal('#mermaid-output')

      const hxVals = JSON.parse(element.getAttribute('hx-vals') ?? '')

      expect(hxVals.highlightNodeId).to.equal('dtmi:com:example:1')
      expect(hxVals.shouldExpand).to.equal(true)
    })

    it('should set shouldExpand to false', () => {
      const element = document.createElement('div')
      element.id = 'flowchart-dtmi:com:example:1-1'

      setElementAttributes(element, {})

      const hxVals = JSON.parse(element.getAttribute('hx-vals') ?? '')
      expect(hxVals.shouldExpand).to.equal(false)
    })

    it('should set highlighNodeId to be null', () => {
      const element = document.createElement('div')
      element.id = 'invalidId'

      setElementAttributes(element, {})

      const hxVals = JSON.parse(element.getAttribute('hx-vals') ?? '')
      expect(hxVals.highlightNodeId).to.equal(null)
    })
  })
})
