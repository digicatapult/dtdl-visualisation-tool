import { describe, test } from 'mocha'

import { expect } from 'chai'
import { DataError } from '../../../errors'
import { updateMap } from '../updateType'

export const dtdlFile = {
  '@context': ['dtmi:dtdl:context;4'],
  '@id': 'dtmi:com:one;1',
  '@type': 'Interface',
  displayName: 'displayName',
  description: 'description',
  comment: 'comment',
}

describe('updateMap', function () {
  describe('happy path', function () {
    test('updates interface display name', async () => {
      const newDisplayName = 'updated'
      expect(updateMap['displayName'](dtdlFile, '', newDisplayName)).to.deep.equal({
        ...dtdlFile,
        displayName: newDisplayName,
      })
    })

    test('updates interface description', async () => {
      const newDescription = 'updated'
      expect(updateMap['description'](dtdlFile, '', newDescription)).to.deep.equal({
        ...dtdlFile,
        description: newDescription,
      })
    })

    test('updates interface comment', async () => {
      const newComment = 'updated'
      expect(updateMap['interfaceComment'](dtdlFile, '', newComment)).to.deep.equal({
        ...dtdlFile,
        comment: newComment,
      })
    })
  })

  describe('sad path', function () {
    test('throws error for display name too long', async () => {
      const newDisplayName = 'a'.repeat(65)
      expect(() => {
        updateMap['displayName'](dtdlFile, '', newDisplayName)
      }).to.throw(DataError)
    })

    test('throws error for description too long', async () => {
      const newDescription = 'a'.repeat(513)
      expect(() => {
        updateMap['description'](dtdlFile, '', newDescription)
      }).to.throw(DataError)
    })

    test('throws error for interface comment too long', async () => {
      const newComment = 'a'.repeat(513)
      expect(() => {
        updateMap['interfaceComment'](dtdlFile, '', newComment)
      }).to.throw(DataError)
    })
  })
})
