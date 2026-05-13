import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'

import { expect } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'

import { fileUrlToInterceptUrl, INTERCEPT_ORIGIN, interceptRequestHandler } from '../puppeteerIntercept.js'

describe('puppeteerIntercept', () => {
  let tmpDir: string
  let testFilePath: string
  const testFileContent = 'export default {}'

  before(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'puppeteer-intercept-test-'))
    testFilePath = path.join(tmpDir, 'test.mjs')
    await writeFile(testFilePath, testFileContent)
  })

  after(async () => {
    sinon.restore()
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('fileUrlToInterceptUrl returns a fake HTTPS URL containing the file path', () => {
    const interceptUrl = fileUrlToInterceptUrl(url.pathToFileURL(testFilePath))
    expect(interceptUrl).to.match(new RegExp(`^${INTERCEPT_ORIGIN}`))
    expect(interceptUrl).to.include('test.mjs')
  })

  it('interceptRequestHandler responds with file content for a matching URL', async () => {
    const interceptUrl = fileUrlToInterceptUrl(url.pathToFileURL(testFilePath))
    const request = {
      url: () => interceptUrl,
      respond: sinon.stub().resolves(),
      abort: sinon.stub().resolves(),
      continue: sinon.stub().resolves(),
    }
    await interceptRequestHandler(request as never)
    expect(request.respond.calledOnce).to.equal(true)
    const response = request.respond.firstCall.args[0]
    expect(response.status).to.equal(200)
    expect(response.body.toString()).to.equal(testFileContent)
    expect(request.continue.called).to.equal(false)
  })

  it('interceptRequestHandler calls continue() for non-intercept URLs', async () => {
    const request = {
      url: () => 'https://cdn.example.com/some-lib.js',
      respond: sinon.stub().resolves(),
      abort: sinon.stub().resolves(),
      continue: sinon.stub().resolves(),
    }
    await interceptRequestHandler(request as never)
    expect(request.continue.calledOnce).to.equal(true)
    expect(request.respond.called).to.equal(false)
  })
})
