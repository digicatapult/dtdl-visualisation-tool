import { describe, test } from 'mocha'

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Parser, { type DtdlPath } from '../parser.js'

import { DtdlObjectModel, ModelingException } from '@digicatapult/dtdl-parser'
import { expect } from 'chai'
import { createHash } from 'crypto'
import { readFile } from 'node:fs/promises'
import pino from 'pino'
import sinon from 'sinon'
import { ModellingError, UploadError } from '../../../errors.js'
import { ICache } from '../../cache.js'
import { LRUCache } from '../../lruCache.js'
import bom from './fixtures/bom/bom.json' assert { type: 'json' }
import complexNested from './fixtures/complexNested/complexNested.json' assert { type: 'json' }
import nestedTwo from './fixtures/nestedDtdl/nested/two.json' assert { type: 'json' }
import nestedOne from './fixtures/nestedDtdl/one.json' assert { type: 'json' }
import valid from './fixtures/someInvalid/valid.json' assert { type: 'json' }
import withPropsAndRels from './fixtures/withPropertiesAndRelationships.json' assert { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mockLogger = pino({ level: 'silent' })
const mockCache = new LRUCache(10, 1000 * 60)
const parser = new Parser(mockLogger, mockCache)

function createMockCache(
  hashKey: string,
  parsedValue: unknown,
  hasCache: boolean
): {
  mockCache: ICache
  hasStub: sinon.SinonStub
  getStub: sinon.SinonStub
  setSpy: sinon.SinonSpy
} {
  const hasStub = sinon.stub().returns(hasCache)
  const getStub = sinon.stub().callsFake((key) => {
    if (hashKey === key) return parsedValue
    return undefined
  })
  const setSpy = sinon.spy()

  return {
    mockCache: {
      has: hasStub,
      get: getStub,
      set: setSpy,
    } as unknown as ICache,
    hasStub,
    getStub,
    setSpy,
  }
}

describe('getJsonfiles', function () {
  test('nested directories', async () => {
    const dir = path.resolve(__dirname, './fixtures/nestedDtdl')
    const result = await parser.getJsonFiles(dir)
    expect(JSON.parse(result[0].source)).to.deep.equal(nestedTwo)
    expect(JSON.parse(result[1].source)).to.deep.equal(nestedOne)
  })

  test('accepts BOM encoded json', async () => {
    const dir = path.resolve(__dirname, './fixtures/bom')
    const result = await parser.getJsonFiles(dir)
    expect(JSON.parse(result[0].source)).to.deep.equal(bom)
  })

  test('ignores invalid json', async () => {
    const dir = path.resolve(__dirname, './fixtures/someInvalid')
    const result = await parser.getJsonFiles(dir)
    expect(result.length).to.equal(1)
    expect(JSON.parse(result[0].source)).to.deep.equal(valid)
  })

  test('accepts complex nested json', async () => {
    const dir = path.resolve(__dirname, './fixtures/complexNested')
    const result = await parser.getJsonFiles(dir)
    expect(JSON.parse(result[0].source)).to.deep.equal(complexNested)
  })

  test('should throw error if json too deeply nested on a single branch', async () => {
    const dir = path.resolve(__dirname, './fixtures/tooNested')

    await expect(parser.getJsonFiles(dir)).to.be.rejectedWith(UploadError, 'too deeply nested')
  })
})

describe('unzipJsonfiles', function () {
  test('nested directories', async () => {
    const zip = path.resolve(__dirname, './fixtures/nestedDtdl.zip')
    const buffer = await readFile(zip)

    const result = await parser.unzipJsonFiles(buffer)
    expect(JSON.parse(result[0].source)).to.deep.equal(nestedOne)
    expect(JSON.parse(result[1].source)).to.deep.equal(nestedTwo)
  })

  test('subdirectory only', async () => {
    const zip = path.resolve(__dirname, './fixtures/nestedDtdl.zip')
    const buffer = await readFile(zip)

    const result = await parser.unzipJsonFiles(buffer, 'nested')
    expect(result.length).to.equal(1)

    expect(JSON.parse(result[0].source)).to.deep.equal(nestedTwo)
  })

  test('accepts BOM encoded json', async () => {
    const zip = path.resolve(__dirname, './fixtures/bom.zip')
    const buffer = await readFile(zip)

    const result = await parser.unzipJsonFiles(buffer)
    expect(JSON.parse(result[0].source)).to.deep.equal(bom)
  })

  test('ignores invalid json', async () => {
    const zip = path.resolve(__dirname, './fixtures/someInvalid.zip')
    const buffer = await readFile(zip)

    const result = await parser.unzipJsonFiles(buffer)
    expect(result.length).to.equal(1)
    expect(JSON.parse(result[0].source)).to.deep.equal(valid)
  })

  test('accepts complex nested json', async () => {
    const zip = path.resolve(__dirname, './fixtures/complexNested.zip')
    const buffer = await readFile(zip)

    const result = await parser.unzipJsonFiles(buffer)
    expect(JSON.parse(result[0].source)).to.deep.equal(complexNested)
  })

  test('should throw error if json too deeply nested on a single branch', async () => {
    const zip = path.resolve(__dirname, './fixtures/tooNested.zip')
    const buffer = await readFile(zip)

    await expect(parser.unzipJsonFiles(buffer)).to.be.rejectedWith(UploadError, 'too deeply nested')
  })

  test('throws error if unzipped files go over size limit', async () => {
    const zip = path.resolve(__dirname, './fixtures/bomb.zip')
    const buffer = await readFile(zip)
    await expect(parser.unzipJsonFiles(buffer)).to.be.rejectedWith(UploadError, `Uncompressed zip exceeds`)
  })

  test('throws error if file paths are longer than maximum allowed', async () => {
    const zip = path.resolve(__dirname, './fixtures/tooLong.zip')
    const buffer = await readFile(zip)
    await expect(parser.unzipJsonFiles(buffer)).to.be.rejectedWith(UploadError, 'File path too long')
  })

  test('throws error if file paths contain path traversal attempts', async () => {
    const zip = path.resolve(__dirname, './fixtures/pathTraversal.zip')
    const buffer = await readFile(zip)
    await expect(parser.unzipJsonFiles(buffer)).to.be.rejectedWith(UploadError, 'path traversal detected')
  })
})

describe('parse', function () {
  test('parses multiple files successfully', async () => {
    const files = [
      { path: '', source: JSON.stringify(nestedOne) },
      { path: '', source: JSON.stringify(nestedTwo) },
    ]
    const result = await parser.parseAll(files)
    expect(result[nestedOne['@id']].Id).to.equal(nestedOne['@id'])
    expect(result[nestedTwo['@id']].Id).to.equal(nestedTwo['@id'])
  })

  test('throws error if bad DTDL', async () => {
    const files = [{ path: '', source: JSON.stringify({}) }]
    await expect(parser.parseAll(files)).to.be.rejectedWith(ModellingError)
  })

  test('parsed dtdl loaded from cache', async () => {
    const files = [{ path: '', source: JSON.stringify(nestedOne) }]

    const allSource = Parser.fileSourceToString(files)
    const dtdlHashKey = createHash('sha256').update(allSource).digest('base64')

    const parsedDtdl = {
      [nestedOne['@id']]: {
        EntityKind: 'Interface',
        Id: nestedOne['@id'],
      },
    }

    const { mockCache, hasStub, getStub, setSpy } = createMockCache(dtdlHashKey, parsedDtdl, true)

    const parser = new Parser(mockLogger, mockCache)

    const result = await parser.parseAll(files)

    expect(result[nestedOne['@id']].Id).to.equal(nestedOne['@id'])
    expect(hasStub.calledOnceWithExactly(dtdlHashKey)).to.equal(true)
    expect(getStub.calledOnce).to.equal(true)
    expect(setSpy.notCalled).to.equal(true)
  })

  test('parses DTDL and sets cache if not found', async () => {
    const files = [{ path: '', source: JSON.stringify(nestedOne) }]
    const allSource = Parser.fileSourceToString(files)
    const dtdlHashKey = createHash('sha256').update(allSource).digest('base64')
    const parsedDtdl = {
      [nestedOne['@id']]: {
        EntityKind: 'Interface',
        Id: nestedOne['@id'],
      },
    }

    const { mockCache, hasStub, getStub, setSpy } = createMockCache(dtdlHashKey, parsedDtdl, false)

    const parser = new Parser(mockLogger, mockCache)

    const result = await parser.parseAll(files)

    expect(hasStub.calledOnceWithExactly(dtdlHashKey)).to.equal(true)
    expect(getStub.notCalled).to.equal(true)
    expect(setSpy.calledOnceWithExactly(dtdlHashKey, result)).to.equal(true)
    expect(result[nestedOne['@id']].Id).to.equal(nestedOne['@id'])
  })
})

describe('validate', function () {
  test('multiple valid files', async () => {
    const files = [
      { path: '', source: JSON.stringify(nestedOne) },
      { path: '', source: JSON.stringify(nestedTwo) },
    ]
    const result = await parser.validate(files)
    expect(result).to.deep.equal(files)
  })

  test('valid file and invalid file', async () => {
    const files = [
      { path: '', source: JSON.stringify(nestedOne) },
      { path: '', source: JSON.stringify({}) },
    ]
    const result = await parser.validate(files)
    expect(result[0]).to.deep.equal(files[0])
    expect(result[1].errors).to.be.an('Array')
    expect(result[1].errors).to.have.length.greaterThan(0)
  })

  test('should throw error if all invalid files', async () => {
    const files = [{ path: '', source: JSON.stringify({}) }]
    await expect(parser.validate(files)).to.be.rejectedWith(ModellingError)
  })
})

describe('extractDtdlPaths', function () {
  const model = {
    [nestedOne['@id']]: {
      Id: nestedOne['@id'],
      EntityKind: 'Interface',
    },
    [nestedTwo['@id']]: {
      Id: nestedTwo['@id'],
      EntityKind: 'Interface',
    },
  } as DtdlObjectModel

  test('extracts paths from simple DTDL', () => {
    const files = [{ path: 'file.json', source: JSON.stringify(nestedOne) }]
    const result = parser.extractDtdlPaths(files, model)
    expect(result).to.deep.equal([
      {
        type: 'file',
        name: 'file.json',
        entries: [
          {
            type: 'fileEntry',
            dtdlType: 'Interface',
            name: nestedOne['@id'],
            id: nestedOne['@id'],
            entries: [],
          },
        ],
      },
    ])
  })

  test('extracts and nests paths from simple DTDL', () => {
    const files = [{ path: 'some/path/file.json', source: JSON.stringify(nestedOne) }]
    const result = parser.extractDtdlPaths(files, model)
    expect(result).to.deep.equal([
      {
        type: 'directory',
        name: 'some',
        entries: [
          {
            type: 'directory',
            name: 'path',
            entries: [
              {
                type: 'file',
                name: 'file.json',
                entries: [
                  {
                    type: 'fileEntry',
                    dtdlType: 'Interface',
                    name: nestedOne['@id'],
                    id: nestedOne['@id'],
                    entries: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('extracts and merges paths from multiple files', () => {
    const files = [
      { path: 'some/path/file.json', source: JSON.stringify(nestedOne) },
      { path: 'some/other/file2.json', source: JSON.stringify(nestedTwo) },
    ]
    const result = parser.extractDtdlPaths(files, model)
    expect(result).to.deep.equal([
      {
        type: 'directory',
        name: 'some',
        entries: [
          {
            type: 'directory',
            name: 'path',
            entries: [
              {
                type: 'file',
                name: 'file.json',
                entries: [
                  {
                    type: 'fileEntry',
                    dtdlType: 'Interface',
                    name: nestedOne['@id'],
                    id: nestedOne['@id'],
                    entries: [],
                  },
                ],
              },
            ],
          },
          {
            type: 'directory',
            name: 'other',
            entries: [
              {
                type: 'file',
                name: 'file2.json',
                entries: [
                  {
                    type: 'fileEntry',
                    dtdlType: 'Interface',
                    name: nestedTwo['@id'],
                    id: nestedTwo['@id'],
                    entries: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('extracts and merges multiple entries in single file', () => {
    const files = [{ path: 'some/path/file.json', source: JSON.stringify([nestedOne, nestedTwo]) }]
    const result = parser.extractDtdlPaths(files, model)
    expect(result).to.deep.equal([
      {
        type: 'directory',
        name: 'some',
        entries: [
          {
            type: 'directory',
            name: 'path',
            entries: [
              {
                type: 'file',
                name: 'file.json',
                entries: [
                  {
                    type: 'fileEntry',
                    dtdlType: 'Interface',
                    name: nestedOne['@id'],
                    id: nestedOne['@id'],
                    entries: [],
                  },
                  {
                    type: 'fileEntry',
                    dtdlType: 'Interface',
                    name: nestedTwo['@id'],
                    id: nestedTwo['@id'],
                    entries: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('extracts and merges multiple entries in single file (deep)', () => {
    const files = [{ path: 'some/path/file.json', source: JSON.stringify([[[nestedOne, nestedTwo]]]) }]
    const result = parser.extractDtdlPaths(files, model)
    expect(result).to.deep.equal([
      {
        type: 'directory',
        name: 'some',
        entries: [
          {
            type: 'directory',
            name: 'path',
            entries: [
              {
                type: 'file',
                name: 'file.json',
                entries: [
                  {
                    type: 'fileEntry',
                    dtdlType: 'Interface',
                    name: nestedOne['@id'],
                    id: nestedOne['@id'],
                    entries: [],
                  },
                  {
                    type: 'fileEntry',
                    dtdlType: 'Interface',
                    name: nestedTwo['@id'],
                    id: nestedTwo['@id'],
                    entries: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('extracts properties and relationships', async () => {
    const files = [{ path: 'file.json', source: JSON.stringify(withPropsAndRels) }]
    const model = await parser.parseAll(files)

    const result = parser.extractDtdlPaths(files, model)
    expect(result).to.deep.equal([
      {
        type: 'file',
        name: 'file.json',
        entries: [
          {
            type: 'fileEntry',
            dtdlType: 'Interface',
            entries: [
              {
                type: 'fileEntryContent',
                dtdlType: 'Property',
                id: 'dtmi:com:first:_contents:__property_a;1',
                name: 'property_a',
              },
              {
                type: 'fileEntryContent',
                dtdlType: 'Relationship',
                id: 'dtmi:com:first:_contents:__relationship_a;1',
                name: 'relationship a',
              },
            ],
            id: 'dtmi:com:first;1',
            name: 'First',
          },
          {
            dtdlType: 'Interface',
            entries: [
              {
                type: 'fileEntryContent',
                dtdlType: 'Property',
                id: 'dtmi:com:second:_contents:__property_b;1',
                name: 'property_b',
              },
            ],
            id: 'dtmi:com:second;1',
            name: 'Second',
            type: 'fileEntry',
          },
        ],
      },
    ])
  })

  test('extracts and merges paths from multiple files - including errors', () => {
    const error: ModelingException = { ExceptionKind: 'Resolution', UndefinedIdentifiers: [''] }
    const files = [
      { path: 'some/path/file.json', source: JSON.stringify(nestedOne), errors: [error] },
      { path: 'some/other/file2.json', source: JSON.stringify(nestedTwo) },
    ]
    const result = parser.extractDtdlPaths(files, model)
    expect(result).to.deep.equal([
      {
        type: 'directory',
        name: 'some',
        entries: [
          {
            type: 'directory',
            name: 'path',
            entries: [
              {
                type: 'file',
                name: 'file.json',
                entries: [],
                errors: [error],
              },
            ],
          },
          {
            type: 'directory',
            name: 'other',
            entries: [
              {
                type: 'file',
                name: 'file2.json',
                entries: [
                  {
                    type: 'fileEntry',
                    dtdlType: 'Interface',
                    name: nestedTwo['@id'],
                    id: nestedTwo['@id'],
                    entries: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
})

describe('hasFileTreeErrors', function () {
  const error: ModelingException = { ExceptionKind: 'Resolution', UndefinedIdentifiers: ['test'] }

  test('returns false when no files have errors', () => {
    const fileTree: DtdlPath[] = [
      {
        type: 'file',
        name: 'test.json',
        entries: [],
      },
    ]
    expect(Parser.hasFileTreeErrors(fileTree)).to.equal(false)
  })

  test('returns true when file has errors', () => {
    const fileTree: DtdlPath[] = [
      {
        type: 'file',
        name: 'test.json',
        entries: [],
        errors: [error],
      },
    ]
    expect(Parser.hasFileTreeErrors(fileTree)).to.equal(true)
  })

  test('returns true when file in directory has errors', () => {
    const fileTree: DtdlPath[] = [
      {
        type: 'directory',
        name: 'directory',
        entries: [
          {
            type: 'file',
            name: 'test.json',
            entries: [],
            errors: [error],
          },
        ],
      },
    ]
    expect(Parser.hasFileTreeErrors(fileTree)).to.equal(true)
  })
})
