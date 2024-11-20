import { expect } from 'chai'
import { describe, test } from 'mocha'

import { InvalidQueryError } from '../../../errors.js'
import { filterModelByDisplayName, getRelatedIdsById, getVisualisationState } from '../filter.js'
import {
  expandedWithRelationships,
  extendedInterface,
  multipleInterfaces,
  multipleInterfacesAndRelationship,
  singleInterfaceFirst,
} from './fixtures.js'

describe('filterModelByDisplayName', function () {
  test('should return empty object for empty model', function () {
    const result = filterModelByDisplayName({}, 'test', [])
    expect(result).to.deep.equal({})
  })

  test('should return empty model if no interfaces match display name', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'test', [])
    expect(result).to.deep.equal({})
  })

  test('should throw if expanded ID not present in model', function () {
    expect(() => {
      filterModelByDisplayName(singleInterfaceFirst, 'test', ['badId'])
    }).to.throw(InvalidQueryError)
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

  test('should include entities extended by a searched interface', function () {
    const result = filterModelByDisplayName(extendedInterface, 'parent', [])
    expect(result).to.deep.equal(extendedInterface)
  })
})

describe('getRelatedIdsById', function () {
  test('should return an empty set for an ID not present in the model', function () {
    const result = getRelatedIdsById(multipleInterfacesAndRelationship, 'nonExistentId')
    expect(result).to.deep.equal(new Set())
  })

  test('should return an empty set for an ID without relationships', function () {
    const result = getRelatedIdsById(multipleInterfacesAndRelationship, 'third')
    expect(result).to.deep.equal(new Set())
  })

  test('should return related IDs for a given ID with direct relationships', function () {
    const result = getRelatedIdsById(expandedWithRelationships, 'first')
    expect(result).to.deep.equal(new Set(['second']))
  })

  test('should handle multiple entities with overlapping relationships', function () {
    const result = getRelatedIdsById(expandedWithRelationships, 'second')
    expect(result).to.deep.equal(new Set(['first', 'third']))
  })

  test('should return extendedBy or extends relations', function () {
    const resultExtends = getRelatedIdsById(extendedInterface, 'parent')
    expect(resultExtends).to.deep.equal(new Set(['child']))
    const resultExtendedBy = getRelatedIdsById(extendedInterface, 'child')
    expect(resultExtendedBy).to.deep.equal(new Set(['parent']))
  })
})
