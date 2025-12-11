import { expect } from 'chai'
import { describe, test } from 'mocha'

import { EntityType } from '@digicatapult/dtdl-parser'
import { getDisplayName, getSchemaDisplayName } from '../extract.js'

describe('getDisplayName', function () {
  test('should return "Entity not found in model" for undefined entity', function () {
    expect(getDisplayName(undefined as unknown as EntityType)).to.equal('Entity not found in model')
  })

  test('should return display name when available', function () {
    const entity = {
      displayName: { en: 'Test Display Name' },
    } as unknown as EntityType
    expect(getDisplayName(entity)).to.equal('Test Display Name')
  })

  test('should return name for named entity without display name', function () {
    const entity = {
      EntityKind: 'Relationship',
      name: 'relationshipName',
    } as unknown as EntityType
    expect(getDisplayName(entity)).to.equal('relationshipName')
  })

  test('should return ID when no display name or name available', function () {
    const entity = {
      Id: 'dtmi:example:Test;1',
    } as unknown as EntityType
    expect(getDisplayName(entity)).to.equal('dtmi:example:Test;1')
  })

  test('should prefer display name over name', function () {
    const entity = {
      EntityKind: 'Property',
      name: 'propertyName',
      displayName: { en: 'Property Display Name' },
    } as unknown as EntityType
    expect(getDisplayName(entity)).to.equal('Property Display Name')
  })
})

describe('getSchemaDisplayName', function () {
  test('should return display name when primitive schema', function () {
    const entity = {
      EntityKind: 'String',
      displayName: { en: 'string' },
    } as unknown as EntityType
    expect(getSchemaDisplayName(entity)).to.equal('string')
  })

  test('should return "Complex schema" when not primitive schema', function () {
    const entity = {
      EntityKind: 'Complex',
    } as unknown as EntityType
    expect(getSchemaDisplayName(entity)).to.equal('Complex schema')
  })
})
