import { expect } from 'chai'
import { describe, test } from 'mocha'

import { DtdlModelWithMetadata, filterModelByDisplayName } from '../filter.js'
import {
  expandedNotInModel,
  expandedWithRelationships,
  multipleInterfaces,
  multipleInterfacesAndRelationship,
  singleInterfaceFirst,
} from './fixtures.js'

const modelWithResults = (modelWithMetadata: DtdlModelWithMetadata, results: string[]) => {
  return {
    ...modelWithMetadata,
    metadata: { ...modelWithMetadata.metadata, searchResults: results },
  }
}

describe('filterModelByDisplayName', function () {
  test('should return empty model for empty model', function () {
    const result = filterModelByDisplayName({ metadata: { expanded: [] }, model: {} }, 'test')
    expect(result).to.deep.equal({ metadata: { expanded: [] }, model: {} })
  })

  test('should return empty model if no interfaces match display name', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'test')
    expect(result).to.deep.equal({ metadata: { expanded: [] }, model: {} })
  })

  test('should return empty model if expanded ID not present in model', function () {
    const result = filterModelByDisplayName(expandedNotInModel, 'test')
    expect(result).to.deep.equal({ model: {}, metadata: expandedNotInModel.metadata })
  })

  test('should include single interface if matches whole string', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'first')
    expect(result).to.deep.equal(modelWithResults(singleInterfaceFirst, ['first']))
  })

  test('should include single interface if matches partial string', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'fir')
    expect(result).to.deep.equal(modelWithResults(singleInterfaceFirst, ['first']))
  })

  test('should include single interface if matches partial string incorrect case', function () {
    const result = filterModelByDisplayName(singleInterfaceFirst, 'FIR')
    expect(result).to.deep.equal(modelWithResults(singleInterfaceFirst, ['first']))
  })

  test('should exclude non-matching interfaces', function () {
    const result = filterModelByDisplayName(multipleInterfaces, 'first')
    expect(result).to.deep.equal(modelWithResults(singleInterfaceFirst, ['first']))
  })

  test('should include all matching interfaces if they exist', function () {
    const result = filterModelByDisplayName(multipleInterfaces, 'r')
    expect(result).to.deep.equal(
      modelWithResults(
        {
          model: {
            first: multipleInterfaces.model.first,
            third: multipleInterfaces.model.third,
          },
          metadata: { expanded: [] },
        },
        ['first', 'third']
      )
    )
  })

  test('should include relationships connected to matches', function () {
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, 'first')
    expect(result).to.deep.equal(
      modelWithResults(
        {
          model: {
            first: multipleInterfacesAndRelationship.model.first,
            second: multipleInterfacesAndRelationship.model.second,
            relFirstSecond: multipleInterfacesAndRelationship.model.relFirstSecond,
          },
          metadata: { expanded: [] },
        },
        ['first']
      )
    )
  })

  test('should include relationships connected to expanded nodes', function () {
    const result = filterModelByDisplayName(expandedWithRelationships, 'first')
    expect(result).to.deep.equal(modelWithResults(expandedWithRelationships, ['first']))
  })

  test('should include entities only once', function () {
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, 's')
    expect(result).to.deep.equal(
      modelWithResults(
        {
          model: {
            first: multipleInterfacesAndRelationship.model.first,
            second: multipleInterfacesAndRelationship.model.second,
            relFirstSecond: multipleInterfacesAndRelationship.model.relFirstSecond,
          },
          metadata: { expanded: [] },
        },
        ['first', 'second']
      )
    )
  })

  test('should not include relationships with missing target', function () {
    const result = filterModelByDisplayName(multipleInterfacesAndRelationship, 'third')
    expect(result).to.deep.equal(
      modelWithResults(
        {
          model: {
            third: multipleInterfacesAndRelationship.model.third,
          },
          metadata: { expanded: [] },
        },
        ['third']
      )
    )
  })
})
