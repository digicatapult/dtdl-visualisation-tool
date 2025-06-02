import { describe, test } from 'mocha'

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Parser from '../parser.js'

import { expect } from 'chai'
import { readFile } from 'node:fs/promises'
import { mockLogger } from '../../../controllers/__tests__/helpers.js'
import { ModellingError, UploadError } from '../../../errors.js'
import bom from './fixtures/bom/bom.json' assert { type: 'json' }
import nestedTwo from './fixtures/nestedDtdl/nested/two.json' assert { type: 'json' }
import nestedOne from './fixtures/nestedDtdl/one.json' assert { type: 'json' }
import valid from './fixtures/someInvalid/valid.json' assert { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const parser = new Parser(mockLogger)

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
})
