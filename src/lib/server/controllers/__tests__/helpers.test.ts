import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { afterEach, describe, it } from 'mocha'
import sinon from 'sinon'
import { modelHistoryCookie } from '../../models/cookieNames.js'
import { recentFilesFromCookies } from '../helpers.js'
import { mockLogger, mockModelDb, previewDtdlId, simpleDtdlId } from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

// Mock cookie data
const validTimestamp = new Date()
validTimestamp.setHours(14, 0, 0, 0)
const invalidModelId = 'invalid-id'

describe('recentFilesFromCookies', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('should handle missing cookie gracefully', async () => {
    const cookies = {}
    const result = await recentFilesFromCookies(mockModelDb, cookies, mockLogger)
    expect(result).to.deep.equal([])
  })

  it('should return recent files for valid cookie history', async () => {
    const cookies = {
      [modelHistoryCookie]: [{ id: previewDtdlId, timestamp: validTimestamp.getTime() }],
    }

    const result = await recentFilesFromCookies(mockModelDb, cookies, mockLogger)

    expect(result).to.deep.equal([
      {
        fileName: 'Preview Model',
        lastVisited: 'Today at 14:00',
        preview: 'Preview',
        dtdlModelId: previewDtdlId,
      },
    ])
  })

  it('should filter out invalid models from cookie history', async () => {
    const cookies = {
      [modelHistoryCookie]: [
        { id: previewDtdlId, timestamp: validTimestamp.getTime() },
        { id: invalidModelId, timestamp: validTimestamp.getTime() },
      ],
    }

    const result = await recentFilesFromCookies(mockModelDb, cookies, mockLogger)

    expect(result).to.deep.equal([
      {
        fileName: 'Preview Model',
        lastVisited: 'Today at 14:00',
        preview: 'Preview',
        dtdlModelId: previewDtdlId,
      },
    ])
  })

  it('should sort recent files by timestamp in descending order', async () => {
    const baseTimestamp = new Date()
    baseTimestamp.setHours(14, 0, 0, 0)

    const simpleModelTimestamp = baseTimestamp.getTime()

    const previewModelTimestamp = new Date(baseTimestamp)
    previewModelTimestamp.setHours(15, 0, 0, 0)

    const cookies = {
      [modelHistoryCookie]: [
        { id: previewDtdlId, timestamp: previewModelTimestamp.getTime() },
        { id: simpleDtdlId, timestamp: simpleModelTimestamp },
      ],
    }

    const result = await recentFilesFromCookies(mockModelDb, cookies, mockLogger)

    expect(result.map((r) => r.fileName)).to.deep.equal(['Preview Model', 'Simple Model'])
  })
})
