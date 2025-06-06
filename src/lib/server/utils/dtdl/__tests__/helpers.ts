import sinon from 'sinon'
import { type ICache } from '../../cache'

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
