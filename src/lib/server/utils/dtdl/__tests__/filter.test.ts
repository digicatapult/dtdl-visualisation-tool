import { expect } from 'chai'
import { describe, test } from 'mocha'

import { DtdlObjectModel, EntityType } from '@digicatapult/dtdl-parser'
import { InvalidQueryError } from '../../../errors.js'
import { FuseSearch } from '../../fuseSearch.js'
import { filterModelByDisplayName, getRelatedIdsById, getVisualisationState, searchInterfaces } from '../filter.js'
import {
  expandedWithRelationships,
  extendedInterface,
  interfaceWithContents,
  multipleInterfaces,
  multipleInterfacesAndRelationship,
  singleInterfaceFirst,
} from './fixtures.js'

const mockSearch = new FuseSearch<EntityType>()
const setCollection = (model: DtdlObjectModel) =>
  mockSearch.setCollection(Object.entries(model).map(([, entity]) => entity))

describe('filterModelByDisplayName', function () {
  test('should return empty object for empty model', function () {
    const result = filterModelByDisplayName({}, mockSearch, 'test', [])
    expect(result).to.deep.equal({})
  })

  test('should return empty model if no interfaces match display name', function () {
    setCollection(singleInterfaceFirst)
    const result = filterModelByDisplayName(singleInterfaceFirst, mockSearch, 'nomatch', [])
    expect(result).to.deep.equal({})
  })

  test('should throw if expanded ID not present in model', function () {
    setCollection(singleInterfaceFirst)
    expect(() => {
      filterModelByDisplayName(singleInterfaceFirst, mockSearch, 'test', ['badId'])
    }).to.throw(InvalidQueryError)
  })

  test('should include single interface if matches whole string', function () {
    setCollection(singleInterfaceFirst)
    const result = filterModelByDisplayName(singleInterfaceFirst, mockSearch, 'first', [])
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should include single interface if matches partial string', function () {
    setCollection(singleInterfaceFirst)
    const result = filterModelByDisplayName(singleInterfaceFirst, mockSearch, 'fir', [])
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should include single interface if matches partial string incorrect case', function () {
    setCollection(singleInterfaceFirst)
    const result = filterModelByDisplayName(singleInterfaceFirst, mockSearch, 'FIR', [])
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should exclude non-matching interfaces', function () {
    setCollection(multipleInterfaces)
    const result = filterModelByDisplayName(multipleInterfaces, mockSearch, 'first', [])
    expect(result).to.deep.equal(singleInterfaceFirst)
  })

  test('should include single relationship if matches whole string', function () {
    setCollection(multipleInterfacesAndRelationship)
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, mockSearch, 'relInvalidTarget', [])
    expect(result).to.deep.equal({
      relInvalidTarget: multipleInterfacesAndRelationship.relInvalidTarget,
    })
  })

  test('should include all matching interfaces if they exist', function () {
    setCollection(multipleInterfaces)
    const result = filterModelByDisplayName(multipleInterfaces, mockSearch, 'r', [])
    expect(result).to.deep.equal({
      first: multipleInterfaces.first,
      third: multipleInterfaces.third,
    })
  })

  test('should include relationships connected to matches', function () {
    setCollection(multipleInterfacesAndRelationship)
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, mockSearch, 'first', [])
    expect(result).to.deep.equal({
      first: multipleInterfacesAndRelationship.first,
      second: multipleInterfacesAndRelationship.second,
      relFirstSecond: multipleInterfacesAndRelationship.relFirstSecond,
    })
  })

  test('should include contents of matches', function () {
    setCollection(interfaceWithContents)
    const result = filterModelByDisplayName(interfaceWithContents, mockSearch, 'first', [])
    expect(result).to.deep.equal({
      first: interfaceWithContents.first,
      someProperty: interfaceWithContents.someProperty,
      someTelemetry: interfaceWithContents.someTelemetry,
    })
  })

  test('should include relationships connected to expanded nodes and assign correct visualisation states', function () {
    setCollection(expandedWithRelationships)
    const result = filterModelByDisplayName(expandedWithRelationships, mockSearch, 'first', ['second'])
    expect(result).to.deep.equal(expandedWithRelationships)
    expect(getVisualisationState(result['first'])).to.equal('search')
    expect(getVisualisationState(result['second'])).to.equal('expanded')
    expect(getVisualisationState(result['third'])).to.equal('unexpanded')
  })

  test('should include entities only once', function () {
    setCollection(multipleInterfacesAndRelationship)
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, mockSearch, 's', [])
    expect(result).to.deep.equal({
      first: multipleInterfacesAndRelationship.first,
      second: multipleInterfacesAndRelationship.second,
      relFirstSecond: multipleInterfacesAndRelationship.relFirstSecond,
    })
  })

  test('should not include relationships with missing target', function () {
    setCollection(multipleInterfacesAndRelationship)
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, mockSearch, 'third', [])
    expect(result).to.deep.equal({
      third: multipleInterfacesAndRelationship.third,
    })
  })

  test('should include entities extended by a searched interface', function () {
    setCollection(extendedInterface)
    const result = filterModelByDisplayName(extendedInterface, mockSearch, 'parent', [])
    expect(result).to.deep.equal(extendedInterface)
  })

  test('should include entities that are extended by expanded entities', function () {
    setCollection(extendedInterface)
    const result = filterModelByDisplayName(extendedInterface, mockSearch, 'child', ['child'])
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

describe('searchInterfaces', function () {
  test('should perform OR for spaces rather than AND', function () {
    setCollection(multipleInterfacesAndRelationship)
    const result = searchInterfaces(mockSearch, 'first second')
    expect(result).to.deep.equal(new Set(['first', 'second', 'relFirstSecond']))
  })

  test('should search display name', function () {
    setCollection(multipleInterfacesAndRelationship)
    const result = searchInterfaces(mockSearch, '"display name"')
    expect(result).to.deep.equal(new Set(['first']))
  })

  test('should be case insensitive', function () {
    setCollection(multipleInterfacesAndRelationship)
    const result = searchInterfaces(mockSearch, 'fIrST')
    expect(result).to.deep.equal(new Set(['first', 'relFirstSecond']))
  })

  test('should group terms if single quoted', function () {
    setCollection(expandedWithRelationships)
    const result = searchInterfaces(mockSearch, `'rel second third'`)
    expect(result).to.deep.equal(new Set(['rel second third']))
  })

  test('should group terms if double quoted', function () {
    setCollection(expandedWithRelationships)
    const result = searchInterfaces(mockSearch, `"rel second third"`)
    expect(result).to.deep.equal(new Set(['rel second third']))
  })

  test('should be fuzzy with typos', function () {
    setCollection(multipleInterfacesAndRelationship)
    const result = searchInterfaces(mockSearch, `fisrt`)
    expect(result).to.deep.equal(new Set(['first']))
  })

  test('should be fuzzy with partial searches', function () {
    setCollection(multipleInterfacesAndRelationship)
    const result = searchInterfaces(mockSearch, `firs seco`)
    expect(result).to.deep.equal(new Set(['first', 'relFirstSecond', 'second']))
  })

  test('should handled grouped and separate terms', function () {
    setCollection(expandedWithRelationships)
    const result = searchInterfaces(mockSearch, `"rel second third" first`)
    expect(result).to.deep.equal(new Set(['first', 'relFirstSecond', 'rel second third']))
  })
})
