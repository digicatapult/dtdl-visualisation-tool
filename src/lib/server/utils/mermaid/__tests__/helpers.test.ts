import { expect } from 'chai'

import { withGroupElement, withPathElement } from './helpers.js'

import {
  boundingBoxFromBoundary,
  boundingBoxIntersects,
  dtdlIdReinstateSemicolon,
  dtdlIdReplaceSemicolon,
  extractPathExtents,
  extractTransformTranslateCoords,
  translateBoundingBox,
} from '../helpers.js'

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

  describe('extractTransformTranslateCoords', () => {
    it('should throw if no transform attribute is present', () => {
      const element = withGroupElement()
      expect(() => extractTransformTranslateCoords(element)).to.throw()
    })

    it("should throw if transform isn't a translate", () => {
      const element = withGroupElement()
      element.setAttribute('transform', 'rotate(90deg)')
      expect(() => extractTransformTranslateCoords(element)).to.throw()
    })

    it('should return translation coords of translate', () => {
      const element = withGroupElement()
      element.setAttribute('transform', 'translate(45.2, 60)')
      expect(extractTransformTranslateCoords(element)).to.deep.equal({ x: 45.2, y: 60 })
    })
  })

  describe('extractPathExtents', () => {
    it('should throw if d attr is missing', function () {
      const element = withPathElement()
      expect(() => extractPathExtents(element)).to.throw()
    })

    it("should throw is path doesn't contain lengths", () => {
      const element = withPathElement()
      element.setAttribute('d', '?')
      expect(() => extractPathExtents(element)).to.throw()
    })

    it('should return extents of path coords (single coord)', () => {
      const element = withPathElement()
      element.setAttribute('d', 'M10 20')
      expect(extractPathExtents(element)).to.deep.equal({
        minX: 10,
        maxX: 10,
        minY: 20,
        maxY: 20,
      })
    })

    it('should return extents of path coords (multiple coord)', () => {
      const element = withPathElement()
      element.setAttribute('d', 'M10 20 L20 20 L20 30 L10 30 L10 20')
      expect(extractPathExtents(element)).to.deep.equal({
        minX: 10,
        maxX: 20,
        minY: 20,
        maxY: 30,
      })
    })

    it('should return extents of path coords (multiple coord decminals)', () => {
      const element = withPathElement()
      element.setAttribute('d', 'M10.5 20.5 L20.5 20.5 L20.5 30.5 L10.5 30.5 L10.5 20.5')
      expect(extractPathExtents(element)).to.deep.equal({
        minX: 10.5,
        maxX: 20.5,
        minY: 20.5,
        maxY: 30.5,
      })
    })
  })

  describe('boundingBoxIntersects', () => {
    const other = {
      x: 5,
      y: 5,
      width: 10,
      height: 10,
      left: 0,
      right: 10,
      top: -5,
      bottom: 5,
    }
    it('should not intersect if on the left', function () {
      const input = {
        x: -5,
        y: 0,
        width: 10,
        height: 10,
        left: -10,
        right: 0,
        top: -5,
        bottom: 5,
      }
      const result = boundingBoxIntersects(input, other)
      expect(result).to.equal(false)
    })

    it('should not intersect if on the right', function () {
      const input = {
        x: 15,
        y: 0,
        width: 10,
        height: 10,
        left: 10,
        right: 20,
        top: -5,
        bottom: 5,
      }
      const result = boundingBoxIntersects(input, other)
      expect(result).to.equal(false)
    })

    it('should not intersect if above', function () {
      const input = {
        x: 0,
        y: -10,
        width: 10,
        height: 10,
        left: -5,
        right: 5,
        top: -15,
        bottom: -5,
      }
      const result = boundingBoxIntersects(input, other)
      expect(result).to.equal(false)
    })

    it('should not intersect if below', function () {
      const input = {
        x: 0,
        y: 10,
        width: 10,
        height: 10,
        left: -5,
        right: 5,
        top: 5,
        bottom: 15,
      }
      const result = boundingBoxIntersects(input, other)
      expect(result).to.equal(false)
    })

    it('should intersect if overlap', function () {
      const input = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        left: -5,
        right: 5,
        top: -5,
        bottom: 5,
      }
      const result = boundingBoxIntersects(input, other)
      expect(result).to.equal(true)
    })
  })

  describe('boundingBoxFromBoundary', () => {
    it('should generate a bounding box', () => {
      const result = boundingBoxFromBoundary(10, 20, 30, 40)
      expect(result).to.deep.equal({
        x: 15,
        y: 35,
        width: 10,
        height: 10,
        top: 30,
        bottom: 40,
        left: 10,
        right: 20,
      })
    })
  })
  describe('translateBoundingBox', () => {
    it('should translate the bounding box', () => {
      const result = translateBoundingBox(
        {
          x: 0,
          y: 0,
          left: -10,
          right: 10,
          top: -10,
          bottom: 10,
          width: 20,
          height: 20,
        },
        10,
        20
      )
      expect(result).to.deep.equal({
        x: 10,
        y: 20,
        left: 0,
        right: 20,
        top: 10,
        bottom: 30,
        width: 20,
        height: 20,
      })
    })
  })
})
