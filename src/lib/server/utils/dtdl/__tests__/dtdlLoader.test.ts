import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import { mockModelDb } from '../../../controllers/__tests__/helpers'
import { InternalError } from '../../../errors'
import { DtdlLoader } from '../dtdlLoader'
import { singleInterfaceFirst as defaultModel } from './fixtures'

chai.use(chaiAsPromised)
const { expect } = chai

const dtdlLoader = new DtdlLoader('1')

describe('dtdlLoader', function () {
  dtdlLoader['modelDb'] = mockModelDb

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
