import { describe, test } from 'mocha'

import { expect } from 'chai'
import { ZodError } from 'zod'
import {
  dtdlFileFixture,
  otherPropertyName,
  otherRelationshipName,
  propertyName,
  relationshipName,
  simpleDtdlFileEntityId,
} from '../../../controllers/__tests__/helpers'
import { DataError } from '../../../errors'
import {
  updateComment,
  updateDescription,
  updateDisplayName,
  updatePropertyComment,
  updatePropertyName,
  updateRelationshipComment,
  updateRelationshipDescription,
  updateRelationshipDisplayName,
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

    test('updates property name', async () => {
      expect(updatePropertyName(newValue, propertyName)(baseFile({}))).to.deep.equal(
        baseFile({ propertyUpdate: { name: newValue } })
      )
    })

    test('updates property comment', async () => {
      expect(updatePropertyComment(newValue, propertyName)(baseFile({}))).to.deep.equal(
        baseFile({ propertyUpdate: { comment: newValue } })
      )
    })
  })

  describe('sad path', function () {
    test('throws Zod error if display name key is missing in file', async () => {
      expect(() => {
        updateDisplayName('display name')({})
      }).to.throw(ZodError)
    })

    test('throws error if new property name matches other property name', async () => {
      expect(() => {
        updatePropertyName(otherPropertyName, propertyName)(baseFile({}))
      }).to.throw(DataError, 'already exists')
    })

    test('throws error if new property name matches other relationship name', async () => {
      expect(() => {
        updatePropertyName(otherRelationshipName, propertyName)(baseFile({}))
      }).to.throw(DataError, 'already exists')
    })

    test('throws error for display name too long', async () => {
      const newDisplayName = 'a'.repeat(65)
      expect(() => {
        updateDisplayName(newDisplayName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for description too long', async () => {
      const newDescription = 'a'.repeat(513)
      expect(() => {
        updateDescription(newDescription)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for interface comment too long', async () => {
      const newComment = 'a'.repeat(513)
      expect(() => {
        updateComment(newComment)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for relationship display name too long', async () => {
      const newDisplayName = 'a'.repeat(65)
      expect(() => {
        updateRelationshipDisplayName(newDisplayName, relationshipName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for relationship description too long', async () => {
      const newDescription = 'a'.repeat(513)
      expect(() => {
        updateRelationshipDescription(newDescription, relationshipName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for relationship comment too long', async () => {
      const newComment = 'a'.repeat(513)
      expect(() => {
        updateRelationshipComment(newComment, relationshipName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for property name too long', async () => {
      const newDisplayName = 'a'.repeat(65)
      expect(() => {
        updatePropertyName(newDisplayName, propertyName)(baseFile({}))
      }).to.throw(DataError)
    })

    test('throws error for property comment too long', async () => {
      const newDescription = 'a'.repeat(513)
      expect(() => {
        updatePropertyComment(newDescription, propertyName)(baseFile({}))
      }).to.throw(DataError)
    })
  })
})
