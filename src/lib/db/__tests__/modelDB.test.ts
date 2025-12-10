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
import { DtdlFile, DtdlSource } from '../types.js'

chai.use(chaiAsPromised)
const { expect } = chai

const defaultFixture = { id: 1, source: 'default' }
const githubFixture = { id: 2, source: 'github' }
const validGithubFixture = {
  id: '2',
  source: 'github',
  owner: 'owner',
  repo: 'repo',
  base_branch: 'main',
  commit_hash: 'sha',
}
const invalidGithubFixture = {
  id: '3',
  source: 'github',
  owner: null,
}
const fileSource: DtdlSource = { '@id': 'someId', '@type': 'Interface' }
const mockFile: DtdlFile = { path: 'path', source: JSON.stringify(fileSource) }
const mockDtdlRow = { id: 1, path: 'path', source: fileSource }
const mockModelRow = {
  id: '1',
  name: 'Model',
  source: 'github',
  owner: 'owner',
  repo: 'repo',
  base_branch: 'main',
  commit_hash: 'sha',
  is_out_of_sync: false,
}

const errorFixture: ModelingException = { ExceptionKind: 'Resolution', UndefinedIdentifiers: [''] }

const dbTransactionMock = {
  insert: sinon.stub().resolves([{ id: '1' as UUID }]),
  delete: sinon.stub().resolves(),
  update: sinon.stub().resolves([mockDtdlRow]),
}

const mockDb = {
  get: sinon.stub().callsFake((_, { id, source, model_id, dtdl_id }) => {
    if (id === '1') return Promise.resolve([defaultFixture])
    if (id === '2') return Promise.resolve([validGithubFixture])
    if (id === '3') return Promise.resolve([invalidGithubFixture])
    if (source === 'default') return Promise.resolve([defaultFixture])
    if (model_id === '1') return Promise.resolve([{ id: '1', path: 'path', source: fileSource }])
    if (dtdl_id === '1') return Promise.resolve([{ id: '1', error: errorFixture }])
    return Promise.resolve([])
  }),
  getJsonb: sinon.stub().callsFake((_model, _process, _column, _exp, [id]) => {
    if (id === '1') return Promise.resolve([mockDtdlRow])
    return Promise.resolve([])
  }),
  update: sinon.stub().callsFake((table) => {
    if (table === 'dtdl') return Promise.resolve([mockDtdlRow])
    if (table === 'model') return Promise.resolve([mockModelRow])
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

  describe('getGithubModelById', () => {
    it('should return github model when valid', async () => {
      expect(await model.getGithubModelById('2')).to.deep.equal(validGithubFixture)
    })

    it('should throw when model is not a github model', async () => {
      await expect(model.getGithubModelById('1')).to.be.rejectedWith(
        InternalError,
        'Model 1 is not a valid GitHub model'
      )
    })

    it('should throw when github model is missing required fields', async () => {
      await expect(model.getGithubModelById('3')).to.be.rejectedWith(
        InternalError,
        'Model 3 is not a valid GitHub model'
      )
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
        'baseBranch',
        'commitHash',
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

  describe('updateModel', () => {
    it('should update the model in the database', async () => {
      const updates = { name: 'New Name' }
      await model.updateModel('1', updates)
      expect((mockDb.update as sinon.SinonStub).calledWith('model', { id: '1' }, updates)).to.equal(true)
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

    it('should return empty if given ID not found', async () => {
      expect(await model.getDtdlFiles('badId')).to.deep.equal([])
    })
  })

  describe('getDtdlModel', () => {
    it('should get parsed DTDL for a model', async () => {
      expect(await model.getDtdlModelAndTree('1')).to.deep.equal({
        model: defaultModel,
        fileTree: singleInterfaceFirstFilePaths,
      })
      expect(mockParserParseStub.firstCall.args[0]).to.deep.equal([
        { path: 'path', source: JSON.stringify(fileSource), errors: [errorFixture] },
      ])
      expect(mockParserExtractPathsStub.firstCall.args).to.deep.equal([
        [{ path: 'path', source: JSON.stringify(fileSource), errors: [errorFixture] }],
        defaultModel,
      ])
    })
  })

  describe('getCollection', () => {
    it('should produce an array of entities for search', async () => {
      expect(model.getCollection(defaultModel)).to.deep.equal([defaultModel.first])
    })
  })

  describe('parseWithUpdatedFiles', () => {
    it('should get parsed DTDL with updated value', async () => {
      const parsedModel = await model.parseWithUpdatedFiles('1', [{ id: '1', source: fileSource }])
      expect(mockParserParseStub.firstCall.args[0]).to.deep.equal([
        { path: 'path', source: JSON.stringify(fileSource) },
      ])
      expect(parsedModel).to.deep.equal(defaultModel)
    })

    it('should throw error if given ID not found', async () => {
      await expect(model.parseWithUpdatedFiles('badId', [{ id: '', source: null }])).to.be.rejectedWith(InternalError)
    })
  })

  describe('getDtdlSourceByInterfaceId', () => {
    it('should return dtdl from database when given an interface id', async () => {
      expect(await model.getDtdlSourceByInterfaceId('1', '1')).to.deep.equal({
        id: 1,
        path: 'path',
        source: fileSource,
      })
    })

    it('should throw error if given ID not found', async () => {
      await expect(model.getDtdlSourceByInterfaceId('', 'badId')).to.be.rejectedWith(InternalError)
    })
  })

  describe('updateDtdlSource', () => {
    it('should return updated dtdl from database', async () => {
      expect(await model.updateDtdlSource('', fileSource)).to.deep.equal(mockDtdlRow)
    })
  })

  describe('deleteOrUpdateDtdlSource', () => {
    it('should update if source provided and delete if source empty', async () => {
      const deleteStub = dbTransactionMock.delete as sinon.SinonStub
      const updateStub = dbTransactionMock.update as sinon.SinonStub

      const dtdlToUpdate = { id: 'someDtdlRowId', source: fileSource }
      const dtdlToDelete = { id: 'someOtherDtdlRowId', source: null }
      await model.deleteOrUpdateDtdlSource([dtdlToUpdate, dtdlToDelete])
      expect(updateStub.firstCall.args).to.deep.equal([
        'dtdl',
        { id: dtdlToUpdate.id },
        { source: JSON.stringify(dtdlToUpdate.source) },
      ])
      expect(deleteStub.firstCall.args).to.deep.equal(['dtdl', { id: dtdlToDelete.id }])
    })
  })
})
