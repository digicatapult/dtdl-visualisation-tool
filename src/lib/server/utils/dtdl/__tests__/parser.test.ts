import { describe, test } from 'mocha'

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Parser from '../parser.js'

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { expect } from 'chai'
import { createHash } from 'crypto'
import { readFile } from 'node:fs/promises'
import { mockCache, mockLogger } from '../../../controllers/__tests__/helpers.js'
import { ModellingError, UploadError } from '../../../errors.js'
import bom from './fixtures/bom/bom.json' assert { type: 'json' }
import complexNested from './fixtures/complexNested/complexNested.json' assert { type: 'json' }
import nestedTwo from './fixtures/nestedDtdl/nested/two.json' assert { type: 'json' }
import nestedOne from './fixtures/nestedDtdl/one.json' assert { type: 'json' }
import valid from './fixtures/someInvalid/valid.json' assert { type: 'json' }
import withPropsAndRels from './fixtures/withPropertiesAndRelationships.json' assert { type: 'json' }
import { createMockCache } from './helpers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const parser = new Parser(mockLogger, mockCache)

describe('getJsonfiles', function () {
  test('nested directories', async () => {
    const dir = path.resolve(__dirname, './fixtures/nestedDtdl')
    const result = await parser.getJsonFiles(dir)
    expect(JSON.parse(result[0].contents)).to.deep.equal(nestedTwo)
    expect(JSON.parse(result[1].contents)).to.deep.equal(nestedOne)
  })

  test('accepts BOM encoded json', async () => {
    const dir = path.resolve(__dirname, './fixtures/bom')
    const result = await parser.getJsonFiles(dir)
    expect(JSON.parse(result[0].contents)).to.deep.equal(bom)
  })

  test('ignores invalid json', async () => {
    const dir = path.resolve(__dirname, './fixtures/someInvalid')
    const result = await parser.getJsonFiles(dir)
    expect(result.length).to.equal(1)
    expect(JSON.parse(result[0].contents)).to.deep.equal(valid)
  })

  test('accepts complex nested json', async () => {
    const dir = path.resolve(__dirname, './fixtures/complexNested')
    const result = await parser.getJsonFiles(dir)
    expect(JSON.parse(result[0].contents)).to.deep.equal(complexNested)
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
    expect(JSON.parse(result[0].contents)).to.deep.equal(nestedOne)
    expect(JSON.parse(result[1].contents)).to.deep.equal(nestedTwo)
  })

  test('subdirectory only', async () => {
    const zip = path.resolve(__dirname, './fixtures/nestedDtdl.zip')
    const buffer = await readFile(zip)

    const result = await parser.unzipJsonFiles(buffer, 'nested')
    expect(result.length).to.equal(1)

    expect(JSON.parse(result[0].contents)).to.deep.equal(nestedTwo)
  })

  test('accepts BOM encoded json', async () => {
    const zip = path.resolve(__dirname, './fixtures/bom.zip')
    const buffer = await readFile(zip)

    const result = await parser.unzipJsonFiles(buffer)
    expect(JSON.parse(result[0].contents)).to.deep.equal(bom)
  })

  test('ignores invalid json', async () => {
    const zip = path.resolve(__dirname, './fixtures/someInvalid.zip')
    const buffer = await readFile(zip)

    const result = await parser.unzipJsonFiles(buffer)
    expect(result.length).to.equal(1)
    expect(JSON.parse(result[0].contents)).to.deep.equal(valid)
  })

  test('accepts complex nested json', async () => {
    const zip = path.resolve(__dirname, './fixtures/complexNested.zip')
    const buffer = await readFile(zip)

    const result = await parser.unzipJsonFiles(buffer)
    expect(JSON.parse(result[0].contents)).to.deep.equal(complexNested)
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
})

describe('parse', function () {
  test('parses multiple files successfully', async () => {
    const files = [
      { path: '', contents: JSON.stringify(nestedOne) },
      { path: '', contents: JSON.stringify(nestedTwo) },
    ]
    const result = await parser.parse(files)
    expect(result[nestedOne['@id']].Id).to.equal(nestedOne['@id'])
    expect(result[nestedTwo['@id']].Id).to.equal(nestedTwo['@id'])
  })

  test('throws error if bad DTDL', async () => {
    const files = [{ path: '', contents: JSON.stringify({}) }]
    await expect(parser.parse(files)).to.be.rejectedWith(ModellingError)
  })

  test('parsed dtdl loaded from cache', async () => {
    const files = [{ path: '', contents: JSON.stringify(nestedOne) }]

    const allContents = `[${files.map((f) => f.contents).join(',')}]`
    const dtdlHashKey = createHash('sha256').update(allContents).digest('base64')

    const parsedDtdl = {
      [nestedOne['@id']]: {
        EntityKind: 'Interface',
        Id: nestedOne['@id'],
      },
    }

    const { mockCache, hasStub, getStub, setSpy } = createMockCache(dtdlHashKey, parsedDtdl, true)

    const parser = new Parser(mockLogger, mockCache)

    const result = await parser.parse(files)

    expect(result[nestedOne['@id']].Id).to.equal(nestedOne['@id'])
    expect(hasStub.calledOnceWithExactly(dtdlHashKey)).to.equal(true)
    expect(getStub.calledOnce).to.equal(true)
    expect(setSpy.notCalled).to.equal(true)
  })

  test('parses DTDL and sets cache if not found', async () => {
    const files = [{ path: '', contents: JSON.stringify(nestedOne) }]
    const allContents = `[${files.map((f) => f.contents).join(',')}]`
    const dtdlHashKey = createHash('sha256').update(allContents).digest('base64')
    const parsedDtdl = {
      [nestedOne['@id']]: {
        EntityKind: 'Interface',
        Id: nestedOne['@id'],
      },
    }

    const { mockCache, hasStub, getStub, setSpy } = createMockCache(dtdlHashKey, parsedDtdl, false)

    const parser = new Parser(mockLogger, mockCache)

    const result = await parser.parse(files)

    expect(hasStub.calledOnceWithExactly(dtdlHashKey)).to.equal(true)
    expect(getStub.notCalled).to.equal(true)
    expect(setSpy.calledOnceWithExactly(dtdlHashKey, result)).to.equal(true)
    expect(result[nestedOne['@id']].Id).to.equal(nestedOne['@id'])
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
    const files = [{ path: 'file.json', contents: JSON.stringify(nestedOne) }]
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
    const files = [{ path: 'some/path/file.json', contents: JSON.stringify(nestedOne) }]
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
      { path: 'some/path/file.json', contents: JSON.stringify(nestedOne) },
      { path: 'some/other/file2.json', contents: JSON.stringify(nestedTwo) },
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
    const files = [{ path: 'some/path/file.json', contents: JSON.stringify([nestedOne, nestedTwo]) }]
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
    const files = [{ path: 'some/path/file.json', contents: JSON.stringify([[[nestedOne, nestedTwo]]]) }]
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
    const files = [{ path: 'file.json', contents: JSON.stringify(withPropsAndRels) }]
    const model = await parser.parse(files)

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
})
