import { ModelingException } from '@digicatapult/dtdl-parser'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { InternalError } from '../../server/errors.js'
import { FileSourceKeys } from '../../server/models/openTypes.js'
import { UUID } from '../../server/models/strings.js'
import {
  singleInterfaceFirst as defaultModel,
  singleInterfaceFirstFilePaths,
} from '../../server/utils/dtdl/__tests__/fixtures.js'
import Parser from '../../server/utils/dtdl/parser.js'
import Database from '../index.js'
import { ModelDb } from '../modelDb.js'
import { DtdlFile } from '../types.js'

chai.use(chaiAsPromised)
const { expect } = chai

const defaultFixture = { id: 1, source: 'default' }
const githubFixture = { id: 2, source: 'github' }
const fileContents = { someDtdlKey: 'someDtdlValue' }
const mockFile: DtdlFile = { path: 'path', contents: JSON.stringify(fileContents) }
const errorFixture: ModelingException = { ExceptionKind: 'Resolution', UndefinedIdentifiers: [''] }

const dbTransactionMock = {
  insert: sinon.stub().resolves([{ id: '1' as UUID }]),
}

const mockDb = {
  get: sinon.stub().callsFake((_, { id, source, model_id, dtdl_id }) => {
    if (id === '1') return Promise.resolve([defaultFixture])
    if (source === 'default') return Promise.resolve([defaultFixture])
    if (model_id === '1') return Promise.resolve([{ id: '1', path: 'path', contents: fileContents }])
    if (dtdl_id === '1') return Promise.resolve([{ id: '1', error: errorFixture }])
    return Promise.resolve([])
  }),
  getJsonb: sinon.stub().callsFake((_model, _process, _column, _exp, [id]) => {
    if (id === '1') return Promise.resolve([mockFile])
    return Promise.resolve([])
  }),
  update: sinon.stub().resolves([mockFile]),
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
const mockParserParseStub = sinon.stub().resolves(defaultModel)
const mockParserExtractPathsStub = sinon.stub().returns(singleInterfaceFirstFilePaths)
const mockParser = {
  validate: sinon.stub().callsFake(async (files) => files),
  parseAll: mockParserParseStub,
  extractDtdlPaths: mockParserExtractPathsStub,
} as unknown as Parser
const model = new ModelDb(mockDb, mockParser)
const modelNoDefault = new ModelDb(mockDbNoDefault, mockParser)

describe('modelDB', function () {
  afterEach(() => {
    mockParserParseStub.resetHistory()
  })

  describe('getModelById', () => {
    it('should return model from database when given an id', async () => {
      expect(await model.getModelById('1')).to.deep.equal(defaultFixture)
    })

    it('should throw when given an id not in the database', async () => {
      await expect(model.getModelById('badId')).to.be.rejectedWith(InternalError)
    })
  })

  describe('getDefaultModel', () => {
    it('should return the default model in the db', async () => {
      expect(await model.getDefaultModel()).to.deep.equal(defaultFixture)
    })
    it('should return empty when there is no default in the database', async () => {
      expect(await modelNoDefault.getDefaultModel()).to.equal(undefined)
    })
  })

  describe('insertModel', () => {
    it('should insert a model into the database and return its ID', async () => {
      const newModelId = await model.insertModel(
        'Test Model',
        'test-preview',
        'default' as FileSourceKeys,
        'owner',
        'repo',
        [{ ...mockFile, errors: [errorFixture] }]
      )
      expect(newModelId).to.equal('1')
      expect((dbTransactionMock.insert as sinon.SinonStub).calledThrice).to.equal(true)
      expect((dbTransactionMock.insert as sinon.SinonStub).secondCall.args).to.deep.equal([
        'dtdl',
        { ...mockFile, model_id: '1' },
      ])
      expect((dbTransactionMock.insert as sinon.SinonStub).thirdCall.args).to.deep.equal([
        'dtdl_error',
        { error: errorFixture, dtdl_id: '1' },
      ])
    })
  })

  describe('deleteModel', () => {
    it('should delete the default model', async () => {
      await model.deleteDefaultModel()
      expect((mockDb.delete as sinon.SinonStub).calledOnceWith('model', { source: 'default' })).to.equal(true)
    })
  })

  describe('getDtdlFiles', () => {
    it('should get files with their error details', async () => {
      expect(await model.getDtdlFiles('1')).to.deep.equal([
        {
          ...mockFile,
          errors: [errorFixture],
        },
      ])
    })

    it('should throw error if given ID not found', async () => {
      await expect(model.getDtdlFiles('badId')).to.be.rejectedWith(InternalError)
    })
  })

  describe('getDtdlModel', () => {
    it('should get parsed DTDL for a model', async () => {
      expect(await model.getDtdlModelAndTree('1')).to.deep.equal({
        model: defaultModel,
        fileTree: singleInterfaceFirstFilePaths,
      })
      expect(mockParserParseStub.firstCall.args[0]).to.deep.equal([
        { path: 'path', contents: JSON.stringify({ someDtdlKey: 'someDtdlValue' }), errors: [errorFixture] },
      ])
      expect(mockParserExtractPathsStub.firstCall.args).to.deep.equal([
        [{ path: 'path', contents: JSON.stringify({ someDtdlKey: 'someDtdlValue' }), errors: [errorFixture] }],
        defaultModel,
      ])
    })
    it('should throw error if given ID not found', async () => {
      await expect(model.getDtdlModelAndTree('badId')).to.be.rejectedWith(InternalError)
    })
  })

  describe('getCollection', () => {
    it('should produce an array of entities for search', async () => {
      expect(model.getCollection(defaultModel)).to.deep.equal([defaultModel.first])
    })
  })

  describe('parseWithUpdatedFile', () => {
    it('should get parse DTDL with updated value', async () => {
      const parsedModel = await model.parseWithUpdatedFile('1', '1', JSON.stringify({ someDtdlKey: 'newValue' }))
      expect(mockParserParseStub.firstCall.args[0]).to.deep.equal([
        { path: 'path', contents: JSON.stringify({ someDtdlKey: 'newValue' }) },
      ])
      expect(parsedModel).to.deep.equal(defaultModel)
    })

    it('should throw error if given ID not found', async () => {
      await expect(model.parseWithUpdatedFile('badId', '', '')).to.be.rejectedWith(InternalError)
    })
  })

  describe('getDtdlByEntityId', () => {
    it('should return dtdl from database when given an entity id', async () => {
      expect(await model.getDtdlByEntityId('1', '1')).to.deep.equal(mockFile)
    })

    it('should throw error if given ID not found', async () => {
      await expect(model.getDtdlByEntityId('', 'badId')).to.be.rejectedWith(InternalError)
    })
  })

  describe('updateDtdlContents', () => {
    it('should updated dtdl from database', async () => {
      expect(await model.updateDtdlContents('', '')).to.deep.equal(mockFile)
    })
  })
})
