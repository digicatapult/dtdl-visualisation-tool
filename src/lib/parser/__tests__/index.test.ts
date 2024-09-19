import { expect } from 'chai'
import { describe, it } from 'mocha'
import path from 'path'
import { searchForJsonFiles } from '../index'
import { Parser } from '../interop'

const mockParser: Parser = {
  parse: async (file: string) => 'test',
  parserVersion: async () => '1.0.0',
}

describe.only('Parser', async () => {
  describe('json', () => {
    it('should return json filepaths', async () => {
      const filepaths = searchForJsonFiles(path.resolve('src/lib/parser/__tests__/fixtures'))
      const filenames = filepaths.map((fp) => path.basename(fp))
      expect(filenames.some((n) => n === 'nested.json')).to.equal(true)
      expect(filenames.some((n) => n === 'simple.json')).to.equal(true)
    })
  })
})
