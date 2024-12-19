import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import Database from '../../../../db'
import { InternalError } from '../../../errors'
import { DtdlLoader } from '../dtdlLoader'
import { singleInterfaceFirst as defaultModel, multipleInterfaces } from './fixtures'

chai.use(chaiAsPromised)
const { expect } = chai

const mockDb = {
  get: sinon.stub().callsFake((_, { id }) => {
    if (id === '1') return Promise.resolve([{ id: 1, parsed: multipleInterfaces }])
    return Promise.resolve([])
  }),
} as unknown as Database
const dtdlLoader = new DtdlLoader(mockDb, defaultModel)

describe('dtdlLoader', function () {
  it('should return default model if given ID not found', async () => {
    expect(await dtdlLoader.getDtdlModel('1')).to.equal(multipleInterfaces)
  })

  it('should return default model if no ID given', async () => {
    expect(await dtdlLoader.getDtdlModel()).to.equal(defaultModel)
  })

  it('should throw error if given ID not found', async () => {
    await expect(dtdlLoader.getDtdlModel('badId')).to.be.rejectedWith(InternalError)
  })

  it('should produce an array of entities for search', async () => {
    expect(dtdlLoader.getCollection(defaultModel)).to.deep.equal([defaultModel.first])
  })
})
