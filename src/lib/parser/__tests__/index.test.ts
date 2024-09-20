import { expect } from 'chai'
import { describe, it } from 'mocha'
import path from 'path'
import { parseDirectories, searchForJsonFiles } from '../index'
import { Parser } from '../interop'

const fixturesFilepath = path.resolve('src/lib/parser/__tests__/fixtures')

const exampleModel = {
  'dtmi:com:example:base;1': {
    languageMajorVersion: 3,
    Id: 'dtmi:com:example:base;1',
    ChildOf: 'dtmi:com:example;1',
    DefinedIn: 'dtmi:com:example;1',
    EntityKind: 'Interface',
    ClassId: 'dtmi:dtdl:class:Interface;3',
    extendedBy: ['dtmi:com:example;1'],
  },
  'dtmi:com:example;1': {
    languageMajorVersion: 3,
    Id: 'dtmi:com:example;1',
    EntityKind: 'Interface',
    ClassId: 'dtmi:dtdl:class:Interface;3',
    extends: ['dtmi:com:example:base;1'],
  },
}

const mockParser: Parser = {
  parse: (_: string) => JSON.stringify(exampleModel),
  parserVersion: () => '1.0.0',
}

const mockParserWithParsingException: Parser = {
  parse: (file: string) => {
    throw new Error(
      JSON.stringify({
        ExceptionKind: 'Parsing',
        Errors: [{ Cause: '', Action: '', ValidationID: '' }],
      })
    )
  },
  parserVersion: () => '1.0.0',
}

describe('parser', () => {
  describe('search for files', () => {
    it('should return nested json filepaths', async () => {
      const filepaths = searchForJsonFiles(fixturesFilepath)
      expect(filepaths.map((fp) => path.basename(fp))).to.deep.equal(['empty.json', 'nested.json'])
    })
  })

  describe('valid parse', () => {
    it('should return model', async () => {
      const model = await parseDirectories(fixturesFilepath, mockParser)
      expect(model).to.deep.equal(exampleModel)
    })
  })

  describe('invalid directory path', () => {
    it('should return null', async () => {
      const model = await parseDirectories('invalid', mockParser)
      expect(model).to.equal(null)
    })
  })

  describe('parsing exception thrown by interop parser', () => {
    it('should return null', async () => {
      const model = await parseDirectories(fixturesFilepath, mockParserWithParsingException)
      expect(model).to.equal(null)
    })
  })
})
