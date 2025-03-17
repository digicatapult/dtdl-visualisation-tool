import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { InternalError } from '../../server/errors.js'
import { FileSourceKeys } from '../../server/models/openTypes.js'
import { UUID } from '../../server/models/strings.js'
import { singleInterfaceFirst as defaultModel } from '../../server/utils/dtdl/__tests__/fixtures.js'
import Parser from '../../server/utils/dtdl/parser.js'
import Database from '../index.js'
import { ModelDb } from '../modelDb.js'
import { DtdlFile } from '../types.js'

chai.use(chaiAsPromised)
const { expect } = chai

const defaultFixture = { id: 1, source: 'default' }
const githubFixture = { id: 2, source: 'github' }
const mockFile: DtdlFile = { path: 'path', contents: '{}' }

const dbTransactionMock = {
  insert: sinon.stub().resolves([{ id: '1' as UUID }]),
}

const mockDb = {
  get: sinon.stub().callsFake((_, { id, source, model_id }) => {
    if (id === '1') return Promise.resolve([defaultFixture])
    if (source === 'default') return Promise.resolve([defaultFixture])
    if (model_id === '1') return Promise.resolve([{ contents: {} }])
    return Promise.resolve([])
  }),
  insert: sinon.stub().resolves([{ id: '3' as UUID }]),
  delete: sinon.stub().resolves(),
  withTransaction: sinon.stub().callsFake(async <T>(handler: (db: Database) => Promise<T>): Promise<T> => {
    return await handler(dbTransactionMock as unknown as Database)
  }),
} as unknown as Database
const mockDbNoDefault = {
  get: sinon.stub().callsFake((_, { id }) => {
    if (id === '1') return Promise.resolve([githubFixture])
    return Promise.resolve([])
  }),
  insert: sinon.stub().resolves([{ id: '3' as UUID }]),
  delete: sinon.stub().resolves(),
} as unknown as Database
const mockParser = {
  parse: sinon.stub().resolves(defaultModel),
} as unknown as Parser
const model = new ModelDb(mockDb, mockParser)
const modelNoDefault = new ModelDb(mockDbNoDefault, mockParser)

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
      'test-preview',
      'default' as FileSourceKeys,
      'owner',
      'repo',
      [mockFile]
    )
    expect(newModelId).to.equal('1')
    expect((dbTransactionMock.insert as sinon.SinonStub).calledTwice).to.equal(true)
    expect((dbTransactionMock.insert as sinon.SinonStub).secondCall.args).to.deep.equal([
      'dtdl',
      { ...mockFile, model_id: '1' },
    ])
  })
  it('should delete the default model', async () => {
    await model.deleteDefaultModel()
    expect((mockDb.delete as sinon.SinonStub).calledOnceWith('model', { source: 'default' })).to.equal(true)
  })
  it('should get parsed DTDL for a model', async () => {
    expect(await model.getDtdlModel('1')).to.deep.equal(defaultModel)
  })
  it('should throw error if given ID not found', async () => {
    await expect(model.getDtdlModel('badId')).to.be.rejectedWith(InternalError)
  })

  it('should produce an array of entities for search', async () => {
    expect(model.getCollection(defaultModel)).to.deep.equal([defaultModel.first])
  })
})
