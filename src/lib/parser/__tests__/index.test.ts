import { expect } from 'chai'
import { describe, it } from 'mocha'
import path from 'path'
import { parseDirectories, searchForJsonFiles, validateDirectories } from '../index'
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
  parse: () => JSON.stringify(exampleModel),
  parserVersion: () => '1.0.0',
}

const mockParserWithParsingException: Parser = {
  parse: () => {
    throw new Error(
      JSON.stringify({
        ExceptionKind: 'Parsing',
        Errors: [{ Cause: '', Action: '', ValidationID: '' }],
      })
    )
  },
  parserVersion: () => '1.0.0',
}

const mockParserWithResolutionException: Parser = {
  parse: () => {
    throw new Error(
      JSON.stringify({
        ExceptionKind: 'Resolution',
      })
    )
  },
  parserVersion: () => '1.0.0',
}

describe('parse', () => {
  describe('search for files', () => {
    it('should return nested json filepaths', async () => {
      const filepaths = searchForJsonFiles(fixturesFilepath)
      expect(filepaths.map((fp) => path.basename(fp))).to.deep.equal(['empty.json', 'nested.json'])
    })
  })

  describe('valid parse', () => {
    it('should return model', async () => {
      const model = parseDirectories(fixturesFilepath, mockParser)
      expect(model).to.deep.equal(exampleModel)
    })
  })

  describe('invalid directory path', () => {
    it('should return null', async () => {
      const model = parseDirectories('invalid', mockParser)
      expect(model).to.equal(null)
    })
  })

  describe('parsing exception thrown by interop parser', () => {
    it('should return null', async () => {
      const model = parseDirectories(fixturesFilepath, mockParserWithParsingException)
      expect(model).to.equal(null)
    })
  })
})

describe('parse', () => {
  describe('valid validate', () => {
    it('should returned validated true', async () => {
      const isValid = validateDirectories(fixturesFilepath, mockParser, false)
      expect(isValid).to.equal(true)
    })
  })

  describe('invalid directory path', () => {
    it('should return null', async () => {
      const isValid = validateDirectories('invalid', mockParser, false)
      expect(isValid).to.equal(false)
    })
  })

  describe('parsing exception thrown by interop validate', () => {
    it('should return false', async () => {
      const isValid = validateDirectories(fixturesFilepath, mockParserWithParsingException, false)
      expect(isValid).to.equal(false)
    })
  })

  describe('resolution exception thrown by interop validate', () => {
    it('should return false if including resolution check', async () => {
      const isValid = validateDirectories(fixturesFilepath, mockParserWithResolutionException, true)
      expect(isValid).to.equal(false)
    })

    it('should return true if NOT including resolution check', async () => {
      const isValid = validateDirectories(fixturesFilepath, mockParserWithResolutionException, false)
      expect(isValid).to.equal(true)
    })
  })
})
