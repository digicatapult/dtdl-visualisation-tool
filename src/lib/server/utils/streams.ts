import { Readable } from 'node:stream'

async function* _concatStreams(...readables: [Readable, ...Readable[]]) {
  for (const readable of readables) {
    for await (const chunk of readable) {
      yield chunk
    }
  }
}

export function concatStreams(...readables: [Readable, ...Readable[]]): Readable {
  return Readable.from(_concatStreams(...readables))
}
