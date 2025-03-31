import { describe, test } from 'mocha'

import { expect } from 'chai'
import { ZodError } from 'zod'
import { DataError } from '../../../errors'
import { updateDescription, updateDisplayName, updateInterfaceComment } from '../entityUpdate'

export const dtdlFile = {
  '@context': ['dtmi:dtdl:context;4'],
  '@id': 'dtmi:com:one;1',
  '@type': 'Interface',
  displayName: 'displayName',
  description: 'description',
  comment: 'comment',
}

describe('entity updates', function () {
  describe('happy path', function () {
    test('updates interface display name', async () => {
      const newDisplayName = 'updated'
      expect(updateDisplayName(newDisplayName)(dtdlFile)).to.deep.equal({
        ...dtdlFile,
        displayName: newDisplayName,
      })
    })

    test('updates interface description', async () => {
      const newDescription = 'updated'
      expect(updateDescription(newDescription)(dtdlFile)).to.deep.equal({
        ...dtdlFile,
        description: newDescription,
      })
    })

    test('updates interface comment', async () => {
      const newComment = 'updated'
      expect(updateInterfaceComment(newComment)(dtdlFile)).to.deep.equal({
        ...dtdlFile,
        comment: newComment,
      })
    })
  })

  describe('sad path', function () {
    test('throws Zod error if display name key is missing in file', async () => {
      expect(() => {
        updateDisplayName('display name')({})
      }).to.throw(ZodError)
    })

    test('throws error for display name too long', async () => {
      const newDisplayName = 'a'.repeat(65)
      expect(() => {
        updateDisplayName(newDisplayName)(dtdlFile)
      }).to.throw(DataError)
    })

    test('throws error for description too long', async () => {
      const newDescription = 'a'.repeat(513)
      expect(() => {
        updateDescription(newDescription)(dtdlFile)
      }).to.throw(DataError)
    })

    test('throws error for interface comment too long', async () => {
      const newComment = 'a'.repeat(513)
      expect(() => {
        updateInterfaceComment(newComment)(dtdlFile)
      }).to.throw(DataError)
    })
  })
})
