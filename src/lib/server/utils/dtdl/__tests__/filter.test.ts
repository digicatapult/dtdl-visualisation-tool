import { expect } from 'chai'
import { describe, test } from 'mocha'

import { filterModelByDisplayName } from '../filter.js'
import { multipleInterfaces, multipleInterfacesAndRelationship, singleInterfaceFirst } from './fixtures.js'

describe('filterModelByDisplayName', function () {
  test('should return empty object for empty model', function () {
    const result = filterModelByDisplayName({}, 'test')
    expect(result).to.deep.equal({})
  })

  test('should return empty object if no interfaces match display name', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'test')
    expect(result).to.deep.equal({})
  })

  test('should include single interface if matches whole string', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'first')
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should include single interface if matches partial string', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'fir')
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should include single interface if matches partial string incorrect case', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'FIR')
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should exclude non-matching interfaces', function () {
    const result = filterModelByDisplayName(multipleInterfaces, 'first')
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should include all matching interfaces if they exist', function () {
    const result = filterModelByDisplayName(multipleInterfaces, 'r')
    expect(result).to.deep.equal({
      first: multipleInterfaces.first,
      third: multipleInterfaces.third,
    })
  })

  test('should include relationships connected to matches', function () {
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, 'first')
    expect(result).to.deep.equal({
      first: multipleInterfacesAndRelationship.first,
      second: multipleInterfacesAndRelationship.second,
      relFirstSecond: multipleInterfacesAndRelationship.relFirstSecond,
    })
  })

  test('should include entities only once', function () {
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, 's')
    expect(result).to.deep.equal({
      first: multipleInterfacesAndRelationship.first,
      second: multipleInterfacesAndRelationship.second,
      relFirstSecond: multipleInterfacesAndRelationship.relFirstSecond,
    })
  })

  test('should not include relationships with missing target', function () {
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, 'third')
    expect(result).to.deep.equal({
      third: multipleInterfacesAndRelationship.third,
    })
  })
})
