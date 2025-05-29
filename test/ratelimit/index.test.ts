import { expect } from 'chai'
import { Express } from 'express'
import { before, describe } from 'mocha'
import { container } from 'tsyringe'

import { resetContainer } from '../../../src/ioc.js'
import Indexer from '../../../src/lib/indexer/index.js'
import { ServiceWatcher } from '../../../src/lib/service-watcher/index.js'
import createHttpServer from '../../../src/server.js'
import { responses as healthResponses } from '../../helper/healthHelper.js'
import { MockDispatcherContext, withDispatcherMock } from '../../helper/mock.js'
import { withAttachmentMockError, withOkMock } from '../../helper/mockHealth.js'
import { get } from '../../helper/routeHelper.js'

const getSpecVersion = (actualResult: any) => {
  return actualResult?._body?.details?.api?.detail?.runtime?.versions?.spec
}
const getAttachmentVersion = (actualResult: any) => {
  return actualResult?._body?.details?.attachment?.detail?.version
}
const getIdentityVersion = (actualResult: any) => {
  return actualResult?._body?.details?.identity?.detail?.version
}
const getIndexerStatus = (actualResult: any) => {
  return actualResult?._body?.details?.indexer?.status
}
const getIndexerStartupTime = (actualResult: any) => {
  return actualResult?._body?.details?.indexer?.detail?.startupTime
}
const getIndexerLatestActivityTime = (actualResult: any) => {
  return actualResult?._body?.details?.indexer?.detail?.latestActivityTime
}
describe('health check', () => {
  describe('happy path', function () {
    let app: Express
    const context: MockDispatcherContext = {} as MockDispatcherContext

    withDispatcherMock(context)
    withOkMock(context)

    before(async function () {
      container.registerSingleton(Indexer)
      app = await createHttpServer()
    })

    after(async function () {
      const serviceWatcher = container.resolve<ServiceWatcher>(ServiceWatcher)
      await serviceWatcher.close()
      resetContainer()
    })

    it('health check', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.ok(
        getSpecVersion(actualResult),
        getAttachmentVersion(actualResult),
        getIdentityVersion(actualResult),
        getIndexerStatus(actualResult),
        getIndexerStartupTime(actualResult),
        getIndexerLatestActivityTime(actualResult)
      )
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })

  describe('attachment service down', function () {
    let app: Express
    const context: MockDispatcherContext = {} as MockDispatcherContext

    withDispatcherMock(context)
    withAttachmentMockError(context)

    before(async function () {
      container.registerSingleton(Indexer)

      app = await createHttpServer()
    })

    after(async function () {
      const serviceWatcher = container.resolve<ServiceWatcher>(ServiceWatcher)
      await serviceWatcher.close()
      resetContainer()
    })

    it('service down', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.attachmentDown(
        getSpecVersion(actualResult),
        getAttachmentVersion(actualResult),
        getIdentityVersion(actualResult),
        getIndexerStatus(actualResult),
        getIndexerStartupTime(actualResult),
        getIndexerLatestActivityTime(actualResult)
      )
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })
})
