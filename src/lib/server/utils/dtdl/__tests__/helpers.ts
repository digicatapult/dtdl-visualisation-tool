import { createHash } from 'crypto'
import sinon from 'sinon'
import { type ICache } from '../../cache'

export function createHashKey(files: { contents: string }[]): { allContents: string; hashKey: string } {
  const allContents = `[${files.map((f) => f.contents).join(',')}]`
  return { allContents, hashKey: createHash('sha256').update(allContents).digest('base64') }
}

export function createMockCache(
  hashKey: string,
  parsedValue: unknown,
  hasCache: boolean
): {
  mockCache: ICache
  hasStub: sinon.SinonStub
  getStub: sinon.SinonStub
  setSpy: sinon.SinonSpy
  clearStub: sinon.SinonStub
  sizeStub: sinon.SinonStub
} {
  const hasStub = sinon.stub().returns(hasCache)
  // eslint warning, _variable works elsewhere in the codebase, not sure why this is an issue here
  const getStub = sinon.stub().callsFake((key) => {
    if (hashKey === key) return parsedValue
    return undefined
  })

  const setSpy = sinon.spy()
  const clearStub = sinon.stub()
  const sizeStub = sinon.stub().returns(0)

  return {
    mockCache: {
      has: hasStub,
      get: getStub,
      set: setSpy,
      clear: clearStub,
      size: sizeStub,
    },
    hasStub,
    getStub,
    setSpy,
    clearStub,
    sizeStub,
  }
}
