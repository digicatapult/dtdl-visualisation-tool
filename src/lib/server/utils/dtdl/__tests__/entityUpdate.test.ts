import { describe, test } from 'mocha'

import { expect } from 'chai'
import { DtdlInterface } from '../../../../db/types'
import {
  dtdlFileFixture,
  propertyName,
  relationshipName,
  simpleDtdlFileEntityId,
  telemetryName,
} from '../../../controllers/__tests__/helpers'
import { DataError } from '../../../errors'
import {
  deleteContent,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_VALUE_LENGTH,
  updateCommandRequestDisplayName,
  updateComment,
  updateDescription,
  updateDisplayName,
  updatePropertyComment,
  updatePropertyDescription,
  updatePropertyDisplayName,
  updatePropertySchema,
  updatePropertyWritable,
  updateRelationshipComment,
  updateRelationshipDescription,
  updateRelationshipDisplayName,
  updateRelationshipTarget,
  updateTelemetryComment,
  updateTelemetryDescription,
  updateTelemetryDisplayName,
  updateTelemetrySchema,
} from '../entityUpdate'

const newValue = 'updated'
const baseFile = dtdlFileFixture(simpleDtdlFileEntityId)

describe('entity updates', function () {
  describe('happy path', function () {
    test('updates interface display name', async () => {
      expect(updateDisplayName(newValue)(baseFile({}))).to.deep.equal(
        baseFile({
          interfaceUpdate: {
            displayName: newValue,
          },
        })
      )
    })

    test('updates interface description', async () => {
      expect(updateDescription(newValue)(baseFile({}))).to.deep.equal(
        baseFile({
          interfaceUpdate: {
            description: newValue,
          },
        })
      )
    })

    test('updates interface comment', async () => {
      expect(updateComment(newValue)(baseFile({}))).to.deep.equal(
        baseFile({
          interfaceUpdate: {
            comment: newValue,
          },
        })
      )
    })

    test('updates relationship display name', async () => {
      expect(updateRelationshipDisplayName(newValue, relationshipName)(baseFile({}))).to.deep.equal(
        baseFile({ relationshipUpdate: { displayName: newValue } })
      )
    })

    test('updates relationship description', async () => {
      expect(updateRelationshipDescription(newValue, relationshipName)(baseFile({}))).to.deep.equal(
        baseFile({ relationshipUpdate: { description: newValue } })
      )
    })

    test('updates relationship comment', async () => {
      expect(updateRelationshipComment(newValue, relationshipName)(baseFile({}))).to.deep.equal(
        baseFile({ relationshipUpdate: { comment: newValue } })
      )
    })

    test('updates relationship target', async () => {
      const newTarget = 'dtmi:com:new_target;1'
      expect(updateRelationshipTarget(newTarget, relationshipName)(baseFile({}))).to.deep.equal(
        baseFile({ relationshipUpdate: { target: newTarget } })
      )
    })

    test('updates relationship target (no-op with same value)', async () => {
      const currentTarget = 'dtmi:com:target;1'
      const fileWithTarget = baseFile({ relationshipUpdate: { target: currentTarget } })
      expect(updateRelationshipTarget(currentTarget, relationshipName)(fileWithTarget)).to.deep.equal(fileWithTarget)
    })

    test('updates property display name', async () => {
      expect(updatePropertyDisplayName(newValue, propertyName)(baseFile({}))).to.deep.equal(
        baseFile({ propertyUpdate: { displayName: newValue } })
      )
    })

    test('updates property description', async () => {
      expect(updatePropertyDescription(newValue, propertyName)(baseFile({}))).to.deep.equal(
        baseFile({ propertyUpdate: { description: newValue } })
      )
    })

    test('updates property comment', async () => {
      expect(updatePropertyComment(newValue, propertyName)(baseFile({}))).to.deep.equal(
        baseFile({ propertyUpdate: { comment: newValue } })
      )
    })

    test('updates property schema', async () => {
      expect(updatePropertySchema('float', propertyName)(baseFile({}))).to.deep.equal(
        baseFile({ propertyUpdate: { schema: 'float' } })
      )
    })

    test('updates property writable', async () => {
      expect(updatePropertyWritable(false, propertyName)(baseFile({}))).to.deep.equal(
        baseFile({ propertyUpdate: { writable: false } })
      )
    })

    test('updates telemetry comment', async () => {
      expect(updateTelemetryComment(newValue, telemetryName)(baseFile({}))).to.deep.equal(
        baseFile({ telemetryUpdate: { comment: newValue } })
      )
    })

    test('updates telemetry schema', async () => {
      expect(updateTelemetrySchema('float', telemetryName)(baseFile({}))).to.deep.equal(
        baseFile({ telemetryUpdate: { schema: 'float' } })
      )
    })

    test('updates telemetry description', async () => {
      expect(updateTelemetryDescription(newValue, telemetryName)(baseFile({}))).to.deep.equal(
        baseFile({ telemetryUpdate: { description: newValue } })
      )
    })

    test('updates telemetry displayName', async () => {
      expect(updateTelemetryDisplayName(newValue, telemetryName)(baseFile({}))).to.deep.equal(
        baseFile({ telemetryUpdate: { displayName: newValue } })
      )
    })

    test('delete content', async () => {
      const file = baseFile({})
      const fileWithoutRelationship = {
        ...file,
        contents: file.contents.filter((c) => c.name !== relationshipName),
      }
      expect(deleteContent(relationshipName)(baseFile({}))).to.deep.equal(fileWithoutRelationship)
    })
  })

  describe('sad path', function () {
    test('throws error for display name too long', async () => {
      const newDisplayName = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)
      expect(() => {
        updateDisplayName(newDisplayName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for description too long', async () => {
      const newDescription = 'a'.repeat(MAX_VALUE_LENGTH + 1)
      expect(() => {
        updateDescription(newDescription)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for interface comment too long', async () => {
      const newComment = 'a'.repeat(MAX_VALUE_LENGTH + 1)
      expect(() => {
        updateComment(newComment)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for relationship display name too long', async () => {
      const newDisplayName = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)
      expect(() => {
        updateRelationshipDisplayName(newDisplayName, relationshipName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for relationship description too long', async () => {
      const newDescription = 'a'.repeat(MAX_VALUE_LENGTH + 1)
      expect(() => {
        updateRelationshipDescription(newDescription, relationshipName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for relationship comment too long', async () => {
      const newComment = 'a'.repeat(MAX_VALUE_LENGTH + 1)
      expect(() => {
        updateRelationshipComment(newComment, relationshipName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for property display name too long', async () => {
      const newDisplayName = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)
      expect(() => {
        updatePropertyDisplayName(newDisplayName, propertyName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for property description too long', async () => {
      const newDescription = 'a'.repeat(MAX_VALUE_LENGTH + 1)
      expect(() => {
        updatePropertyDescription(newDescription, propertyName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for property comment too long', async () => {
      const newComment = 'a'.repeat(MAX_VALUE_LENGTH + 1)
      expect(() => {
        updatePropertyComment(newComment, propertyName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for telemetry comment too long', async () => {
      const newComment = 'a'.repeat(MAX_VALUE_LENGTH + 1)
      expect(() => {
        updateTelemetryComment(newComment, telemetryName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for telemetry description too long', async () => {
      const newDescription = 'a'.repeat(MAX_VALUE_LENGTH + 1)
      expect(() => {
        updateTelemetryDescription(newDescription, telemetryName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for telemetry displayName too long', async () => {
      const newDisplayName = 'a'.repeat(MAX_VALUE_LENGTH + 1)
      expect(() => {
        updateTelemetryDisplayName(newDisplayName, telemetryName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for relationship target with invalid characters', async () => {
      expect(() => {
        updateRelationshipTarget('dtmi:invalid"target;1', relationshipName)(baseFile({}))
      }).to.throw(DataError, 'Invalid JSON')
    })

    test('throws error for empty relationship target', async () => {
      expect(() => {
        updateRelationshipTarget('', relationshipName)(baseFile({}))
      }).to.throw(DataError, 'Target cannot be empty')
    })

    test('throws error for relationship target with only whitespace', async () => {
      expect(() => {
        updateRelationshipTarget('   ', relationshipName)(baseFile({}))
      }).to.throw(DataError, 'Target cannot be empty')
    })

    test('throws Zod error if relationship does not exist for target update', async () => {
      expect(() => {
        updateRelationshipTarget('dtmi:com:target;1', 'nonExistentRelationship')(baseFile({}))
      })
    })
  })

  describe('key order retention', function () {
    test('updateContentsValue retains key order', () => {
      const input = { z_first: 1, ...baseFile({}), a_last: 2 }
      const result = updatePropertyDisplayName('new', propertyName)(input as DtdlInterface)
      expect(Object.keys(result)[0]).to.equal('z_first')
      expect(Object.keys(result).pop()).to.equal('a_last')
    })

    test('updateCommandRequestResponseValue retains key order', () => {
      const commandName = 'myCmd'
      const input = {
        z_first: 1,
        '@id': 'dtmi:com:example;1',
        '@type': 'Interface',
        displayName: 'Example',
        contents: [{ '@type': 'Command', name: commandName, request: { name: 'req' } }],
        a_last: 2,
      }
      const result = updateCommandRequestDisplayName('new', commandName)(input as DtdlInterface)
      expect(Object.keys(result)[0]).to.equal('z_first')
      expect(Object.keys(result).pop()).to.equal('a_last')
    })

    test('deleteContent retains key order', () => {
      const input = { z_first: 1, ...baseFile({}), a_last: 2 }
      const result = deleteContent(propertyName)(input as DtdlInterface)
      expect(Object.keys(result)[0]).to.equal('z_first')
      expect(Object.keys(result).pop()).to.equal('a_last')
    })
  })
})
