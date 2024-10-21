import { Readable } from 'node:stream'

import { expect } from 'chai'
import { describe, test } from 'mocha'

import { concatStreams } from '../streams.js'

const streamToArray = async (stream): Promise<unknown> => {
  const result: unknown[] = []
  for await (const item of stream) {
    result.push(item)
  }
  return result
}

describe('concatStreams', function () {
  test('with a single stream', async function () {
    const stream = concatStreams(Readable.from([1, 2, 3, 4]))
    const result = await streamToArray(stream)
    expect(result).to.deep.equal([1, 2, 3, 4])
  })

  test('with multiple streams', async function () {
    const stream = concatStreams(Readable.from([1, 2, 3, 4]), Readable.from([5, 6, 7, 8]), Readable.from([9, 10]))
    const result = await streamToArray(stream)
    expect(result).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
})
