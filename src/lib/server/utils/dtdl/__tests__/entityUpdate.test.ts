import { describe, test } from 'mocha'

import { expect } from 'chai'
import { DtdlInterface } from '../../../../db/types'
import { dtdlFileFixture, propertyName, relationshipName, telemetryName } from '../../../controllers/__tests__/helpers'
import { DataError } from '../../../errors'
import {
  addContent,
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
const baseFile = dtdlFileFixture('dtmi:com:one;1')

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

  describe('addContent', function () {
    describe('happy path', function () {
      test('adds a new Property with default schema', () => {
        const result = addContent('newProperty', 'Property')(baseFile({}))
        const contents = result.contents as Array<{ name: string; '@type': string; schema?: string }>
        const newProperty = contents.find((c) => c.name === 'newProperty')
        void expect(newProperty).to.not.be.undefined
        void expect(newProperty?.['@type']).to.equal('Property')
        void expect(newProperty?.schema).to.equal('string')
      })

      test('adds a new Relationship without schema', () => {
        const result = addContent('newRelationship', 'Relationship')(baseFile({}))
        const contents = result.contents as Array<{ name: string; '@type': string; schema?: string }>
        const newRelationship = contents.find((c) => c.name === 'newRelationship')
        void expect(newRelationship).to.not.be.undefined
        void expect(newRelationship?.['@type']).to.equal('Relationship')
        void expect(newRelationship?.schema).to.be.undefined
      })

      test('adds a new Telemetry with default schema', () => {
        const result = addContent('newTelemetry', 'Telemetry')(baseFile({}))
        const contents = result.contents as Array<{ name: string; '@type': string; schema?: string }>
        const newTelemetry = contents.find((c) => c.name === 'newTelemetry')
        void expect(newTelemetry).to.not.be.undefined
        void expect(newTelemetry?.['@type']).to.equal('Telemetry')
        void expect(newTelemetry?.schema).to.equal('string')
      })

      test('adds a new Command without schema', () => {
        const result = addContent('newCommand', 'Command')(baseFile({}))
        const contents = result.contents as Array<{ name: string; '@type': string; schema?: string }>
        const newCommand = contents.find((c) => c.name === 'newCommand')
        void expect(newCommand).to.not.be.undefined
        void expect(newCommand?.['@type']).to.equal('Command')
        void expect(newCommand?.schema).to.be.undefined
      })

      test('adds content to an interface with no contents', () => {
        const dtdlInterface: DtdlInterface = {
          '@type': 'Interface',
          '@id': 'dtmi:com:example:Interface;1',
          displayName: 'Interface',
          '@context': 'dtmi:dtdl:context;2',
        }

        const result = addContent('newProperty', 'Property')(dtdlInterface)

        expect(result.contents).to.have.lengthOf(1)
        expect(result.contents?.[0]).to.deep.include({
          '@type': 'Property',
          name: 'newProperty',
          schema: 'string',
        })
      })
    })

    describe('validation errors', function () {
      test('throws error for empty content name', () => {
        expect(() => {
          addContent('', 'Property')(baseFile({}))
        }).to.throw(DataError, 'Content name cannot be empty')
      })

      test('throws error for whitespace-only content name', () => {
        expect(() => {
          addContent('   ', 'Property')(baseFile({}))
        }).to.throw(DataError, 'Content name cannot be empty')
      })

      test('throws error for content name with invalid characters', () => {
        expect(() => {
          addContent('invalid"name', 'Property')(baseFile({}))
        }).to.throw(DataError, 'Invalid JSON')
      })

      test('throws error for content name too long', () => {
        const longName = 'a'.repeat(MAX_VALUE_LENGTH + 1)
        expect(() => {
          addContent(longName, 'Property')(baseFile({}))
        }).to.throw(DataError, `Content name has max length of ${MAX_VALUE_LENGTH} characters`)
      })

      test('throws error for duplicate content name', () => {
        expect(() => {
          addContent(propertyName, 'Property')(baseFile({}))
        }).to.throw(DataError, `Content with name '${propertyName}' already exists`)
      })

      test('throws error when adding content with same name as relationship', () => {
        expect(() => {
          addContent(relationshipName, 'Property')(baseFile({}))
        }).to.throw(DataError, `Content with name '${relationshipName}' already exists`)
      })

      test('throws error when adding content with same name as telemetry', () => {
        expect(() => {
          addContent(telemetryName, 'Command')(baseFile({}))
        }).to.throw(DataError, `Content with name '${telemetryName}' already exists`)
      })

      test('throws error for content name with forward slash', () => {
        expect(() => {
          addContent('tcp/ip', 'Property')(baseFile({}))
        }).to.throw(
          DataError,
          `Content name 'tcp/ip' is invalid. Must start with a letter, contain only letters, numbers, and underscores, and cannot end with an underscore.`
        )
      })

      test('throws error for content name starting with number', () => {
        expect(() => {
          addContent('123property', 'Property')(baseFile({}))
        }).to.throw(
          DataError,
          `Content name '123property' is invalid. Must start with a letter, contain only letters, numbers, and underscores, and cannot end with an underscore.`
        )
      })

      test('throws error for content name ending with underscore', () => {
        expect(() => {
          addContent('property_', 'Property')(baseFile({}))
        }).to.throw(
          DataError,
          `Content name 'property_' is invalid. Must start with a letter, contain only letters, numbers, and underscores, and cannot end with an underscore.`
        )
      })

      test('throws error for content name with hyphen', () => {
        expect(() => {
          addContent('my-property', 'Property')(baseFile({}))
        }).to.throw(
          DataError,
          `Content name 'my-property' is invalid. Must start with a letter, contain only letters, numbers, and underscores, and cannot end with an underscore.`
        )
      })

      test('allows valid content name with underscores', () => {
        const result = addContent('my_valid_property_123', 'Property')(baseFile({}))
        const contents = result.contents as Array<{ name: string }>
        const newProperty = contents.find((c) => c.name === 'my_valid_property_123')
        void expect(newProperty).to.not.be.undefined
      })
    })
  })
  describe('key order retention', function () {
    test('updateContentsValue preserves key order', () => {
      const input = { z_first: 1, ...baseFile({}), a_last: 2 }
      const result = updatePropertyDisplayName('new', propertyName)(input as DtdlInterface)
      expect(Object.keys(result)[0]).to.equal('z_first')
      expect(Object.keys(result).pop()).to.equal('a_last')
    })

    test('updateCommandRequestResponseValue preserves key order', () => {
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

    test('deleteContent preserves key order', () => {
      const input = { z_first: 1, ...baseFile({}), a_last: 2 }
      const result = deleteContent(propertyName)(input as DtdlInterface)
      expect(Object.keys(result)[0]).to.equal('z_first')
      expect(Object.keys(result).pop()).to.equal('a_last')
    })
  })
})
