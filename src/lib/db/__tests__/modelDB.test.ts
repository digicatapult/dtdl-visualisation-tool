import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { InternalError } from '../../server/errors.js'
import { multipleInterfaces } from '../../server/utils/dtdl/__tests__/fixtures.js'
import Database from '../index.js'
import { ModelDb } from '../modelDb.js'

chai.use(chaiAsPromised)
const { expect } = chai

const defaultFixture = { id: 1, parsed: multipleInterfaces, source: 'default' }
const githubFixture = { id: 2, parsed: multipleInterfaces, source: 'github' }

const mockDb = {
  get: sinon.stub().callsFake((_, { id, source }) => {
    if (id === '1') return Promise.resolve([defaultFixture])
    if (source === 'default') return Promise.resolve([defaultFixture])
    return Promise.resolve([])
  }),
} as unknown as Database
const mockDbNoDefault = {
  get: sinon.stub().callsFake((_, { id }) => {
    if (id === '1') return Promise.resolve([githubFixture])
    return Promise.resolve([])
  }),
} as unknown as Database
const model = new ModelDb(mockDb)
const modelNoDefault = new ModelDb(mockDbNoDefault)

describe('modelDB', function () {
  it('should return model id from database when given an id', async () => {
    expect(await model.getModelById('1')).to.deep.equal(defaultFixture)
  })
  it('should throw when given an id not in the database', async () => {
    await expect(model.getModelById('badId')).to.be.rejectedWith(InternalError)
  })
  it('should return the default model in the db', async () => {
    expect(await model.getDefaultModel()).to.deep.equal(defaultFixture)
  })
  it('should throw when there is no default in the database', async () => {
    await expect(modelNoDefault.getDefaultModel()).to.be.rejectedWith(InternalError)
  })
})
