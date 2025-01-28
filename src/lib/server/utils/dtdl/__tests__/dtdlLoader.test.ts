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
const dtdlLoader = new DtdlLoader(mockDb, '1')

describe('dtdlLoader', function () {
  it('should return default model id from when dtdlLoader was instantiated', async () => {
    expect(dtdlLoader.getDefaultId()).to.equal('1')
  })

  it('should throw error if given ID not found', async () => {
    await expect(dtdlLoader.getDtdlModel('badId')).to.be.rejectedWith(InternalError)
  })

  it('should produce an array of entities for search', async () => {
    expect(dtdlLoader.getCollection(defaultModel)).to.deep.equal([defaultModel.first])
  })
})
