import { expect } from 'chai'
import { describe, test } from 'mocha'

import { filterModelByDisplayName, getVisualisationState } from '../filter.js'
import {
  expandedWithRelationships,
  multipleInterfaces,
  multipleInterfacesAndRelationship,
  singleInterfaceFirst,
} from './fixtures.js'

describe('filterModelByDisplayName', function () {
  test('should return empty model for empty model', function () {
    const result = filterModelByDisplayName({}, 'test', [])
    expect(result).to.deep.equal({})
  })

  test('should return empty model if no interfaces match display name', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'test', [])
    expect(result).to.deep.equal({})
  })

  test('should return empty model if expanded ID not present in model', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'test', ['badId'])
    expect(result).to.deep.equal({})
  })

  test('should include single interface if matches whole string', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'first', [])
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should include single interface if matches partial string', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'fir', [])
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should include single interface if matches partial string incorrect case', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'FIR', [])
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should exclude non-matching interfaces', function () {
    const result = filterModelByDisplayName(multipleInterfaces, 'first', [])
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should include all matching interfaces if they exist', function () {
    const result = filterModelByDisplayName(multipleInterfaces, 'r', [])
    expect(result).to.deep.equal({
      first: multipleInterfaces.first,
      third: multipleInterfaces.third,
    })
  })

  test('should include relationships connected to matches', function () {
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, 'first', [])
    expect(result).to.deep.equal({
      first: multipleInterfacesAndRelationship.first,
      second: multipleInterfacesAndRelationship.second,
      relFirstSecond: multipleInterfacesAndRelationship.relFirstSecond,
    })
  })

  test('should include relationships connected to expanded nodes and assign correct visualisation states', function () {
    const result = filterModelByDisplayName(expandedWithRelationships, 'first', ['second'])
    expect(result).to.deep.equal(expandedWithRelationships)
    expect(getVisualisationState(result['first'])).to.equal('search')
    expect(getVisualisationState(result['second'])).to.equal('expanded')
    expect(getVisualisationState(result['third'])).to.equal('unexpanded')
  })

  test('should return all with empty search and all interfaces have `search` visualisation state', function () {
    const result = filterModelByDisplayName(expandedWithRelationships, '', [])
    expect(result).to.deep.equal(expandedWithRelationships)
    expect(getVisualisationState(result['first'])).to.equal('search')
    expect(getVisualisationState(result['second'])).to.equal('search')
    expect(getVisualisationState(result['third'])).to.equal('search')
    expect(getVisualisationState(result['relFirstSecond'])).to.equal(undefined)
  })

  test('should include entities only once', function () {
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, 's', [])
    expect(result).to.deep.equal({
      first: multipleInterfacesAndRelationship.first,
      second: multipleInterfacesAndRelationship.second,
      relFirstSecond: multipleInterfacesAndRelationship.relFirstSecond,
    })
  })

  test('should not include relationships with missing target', function () {
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, 'third', [])
    expect(result).to.deep.equal({
      third: multipleInterfacesAndRelationship.third,
    })
  })
})
