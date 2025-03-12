import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { InternalError } from '../../server/errors.js'
import { FileSourceKeys } from '../../server/models/openTypes.js'
import { UUID } from '../../server/models/strings.js'
import { singleInterfaceFirst as defaultModel, multipleInterfaces } from '../../server/utils/dtdl/__tests__/fixtures.js'
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
  insert: sinon.stub().resolves([{ id: '3' as UUID }]),
  delete: sinon.stub().resolves(),
} as unknown as Database
const mockDbNoDefault = {
  get: sinon.stub().callsFake((_, { id }) => {
    if (id === '1') return Promise.resolve([githubFixture])
    return Promise.resolve([])
  }),
  insert: sinon.stub().resolves([{ id: '3' as UUID }]),
  delete: sinon.stub().resolves(),
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
  it('should return empty when there is no default in the database', async () => {
    expect(await modelNoDefault.getDefaultModel()).to.equal(undefined)
  })
  it('should insert a model into the database and return its ID', async () => {
    const newModelId = await model.insertModel(
      'Test Model',
      multipleInterfaces,
      'test-preview',
      'default' as FileSourceKeys,
      'owner',
      'repo'
    )
    expect(newModelId).to.equal('3')
    expect((mockDb.insert as sinon.SinonStub).calledOnce).to.equal(true)
  })
  it('should delete the default model', async () => {
    await model.deleteDefaultModel()
    expect((mockDb.delete as sinon.SinonStub).calledOnceWith('model', { source: 'default' })).to.equal(true)
  })
  it('should throw error if given ID not found', async () => {
    await expect(model.getDtdlModel('badId')).to.be.rejectedWith(InternalError)
  })

  it('should produce an array of entities for search', async () => {
    expect(model.getCollection(defaultModel)).to.deep.equal([defaultModel.first])
  })
})
