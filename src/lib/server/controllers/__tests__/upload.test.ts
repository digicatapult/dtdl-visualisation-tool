import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { readFileSync } from 'fs'
import { describe, it } from 'mocha'
import path from 'path'
import pino from 'pino'
import sinon from 'sinon'
import { ModelDb } from '../../../db/modelDb.js'
import { UploadError } from '../../errors.js'
import { modelHistoryCookie } from '../../models/cookieNames.js'
import { UUID } from '../../models/strings.js'
import { ICache } from '../../utils/cache.js'
import Parser from '../../utils/dtdl/parser.js'
import { LRUCache } from '../../utils/lruCache.js'
import { SvgGenerator } from '../../utils/mermaid/generator.js'
import { PostHogService } from '../../utils/postHog/postHogService.js'
import OntologyOpenTemplates from '../../views/templates/ontologyOpen.js'
import { OpenOntologyController } from '../upload.js'
import { simpleMockDtdlObjectModel } from './fixtures/dtdl.fixtures.js'
import { mockReq, mockReqWithCookie, toHTMLString } from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const previewDtdlId: UUID = 'b89f1597-2f84-4b15-a8ff-78eda0da5ed8'

const unzipJsonFilesStub = sinon.stub()
const mockParser = {
  validate: sinon.stub().callsFake(async (files) => files),
  parseAll: sinon.stub().resolves(simpleMockDtdlObjectModel),
  unzipJsonFiles: unzipJsonFilesStub,
} as unknown as Parser

const mockModelDb = {
  getModelById: sinon.stub().callsFake((id: UUID) => {
    if (id === 'invalid') return Promise.resolve(null)
    return Promise.resolve({ id: previewDtdlId, name: 'preview' })
  }),
  insertModel: sinon.stub().resolves('1'),
} as unknown as ModelDb

const mockGenerator = {
  run: sinon.stub().resolves({
    renderForMinimap: () => 'preview-svg',
  }),
} as unknown as SvgGenerator

const mockOpenOntology = {
  OpenOntologyRoot: sinon.stub().returns('root_root'),
  getMenu: sinon
    .stub()
    .callsFake(({ showContent }: { showContent: boolean }) => `uploadMethod_${showContent}_uploadMethod`),
} as unknown as OntologyOpenTemplates

const mockPostHog = {
  trackUploadOntology: sinon.stub().resolves(),
} as unknown as PostHogService

const mockLogger = pino({ level: 'silent' })
const mockCache = new LRUCache(10, 1000 * 60) as ICache

describe('OpenOntologyController', () => {
  const controller = new OpenOntologyController(
    mockModelDb,
    mockGenerator,
    mockOpenOntology,
    mockParser,
    mockPostHog,
    mockLogger,
    mockCache
  )

  afterEach(() => {
    mockCache.clear()
    sinon.restore()
  })

  describe('/', () => {
    it('Should return rendered open ontology template', async () => {
      const req = mockReqWithCookie({})
      const result = await controller.open(req).then(toHTMLString)
      expect(result).to.equal(`root_root`)
    })

    it('Should set HX-Push-Url header when session ID is provided', async () => {
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const req = mockReqWithCookie({})
      await controller.open(req)
      expect(setHeaderSpy.calledWith('HX-Push-Url', `/open`)).to.equal(true)
    })

    it('Should handle missing cookie gracefully', async () => {
      const reqWithoutCookie = mockReqWithCookie({})
      reqWithoutCookie.signedCookies = {}

      const result = await controller.open(reqWithoutCookie).then(toHTMLString)
      expect(result).to.equal(`root_root`)
    })

    it('Should filter out invalid models from cookie history', async () => {
      const req = mockReqWithCookie({
        [modelHistoryCookie]: [
          { id: previewDtdlId, timestamp: 1633024800000 },
          { id: 'invalid', timestamp: 1633024800001 },
        ],
      })

      await controller.open(req).then(toHTMLString)

      const calledWithFiles = (mockOpenOntology.OpenOntologyRoot as sinon.SinonStub).lastCall.args[0].recentFiles
      expect(calledWithFiles).to.have.lengthOf(1)
      expect(calledWithFiles[0].dtdlModelId).to.equal(previewDtdlId)
    })
  })

  describe('menu', () => {
    it('Should return rendered upload method template', async () => {
      const result = await controller.getMenu(true).then(toHTMLString)
      expect(result).to.equal(`uploadMethod_${true}_uploadMethod`)
    })
  })

  describe('zip upload', () => {
    it('should insert to db and redirect to view on success', async () => {
      unzipJsonFilesStub.resolves([{ path: '', contents: '' }])
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const mockFile = {
        mimetype: 'application/zip',
        buffer: readFileSync(path.resolve(__dirname, 'fixtures/simple.zip')),
        originalname: 'test.zip',
      }
      const req = mockReq({})
      await controller.uploadZip(mockFile as Express.Multer.File, req)
      const hxRedirectHeader = setHeaderSpy.firstCall.args[1]

      expect((mockModelDb.insertModel as sinon.SinonStub).calledOnce).to.equal(true)
      expect(hxRedirectHeader).to.equal(`/ontology/1/view`)
    })

    it(`should error on non-'application/zip' mimetype`, async () => {
      const mockFile = {
        mimetype: 'application/json',
      }
      const req = mockReq({})

      await expect(controller.uploadZip(mockFile as Express.Multer.File, req)).to.be.rejectedWith(
        UploadError,
        'File must be a .zip'
      )
    })

    it('should throw error if no json files found', async () => {
      unzipJsonFilesStub.resolves([])
      const mockFile = {
        mimetype: 'application/zip',
        buffer: Buffer.from(''),
      }
      const req = mockReq({})

      await expect(controller.uploadZip(mockFile as Express.Multer.File, req)).to.be.rejectedWith(
        UploadError,
        `No valid '.json' files found`
      )
    })
  })
})
