import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import express from 'express'
import { afterEach, describe, it } from 'mocha'
import sinon from 'sinon'
import { container } from 'tsyringe'

import { readFileSync } from 'node:fs'
import path from 'node:path'
import pino, { Logger } from 'pino'
import { ModelDb } from '../../../db/modelDb.js'
import { Env } from '../../env/index.js'
import { GithubNotFound, GithubReqError } from '../../errors.js'
import { octokitTokenCookie } from '../../models/cookieNames.js'
import { ListItem, OAuthToken } from '../../models/github.js'
import { ICache } from '../../utils/cache.js'
import Parser from '../../utils/dtdl/parser.js'
import { GithubRequest } from '../../utils/githubRequest.js'
import { LRUCache } from '../../utils/lruCache.js'
import { SvgGenerator } from '../../utils/mermaid/generator.js'
import { PostHogService } from '../../utils/postHog/postHogService.js'
import OntologyOpenTemplates from '../../views/templates/ontologyOpen.js'
import { ensureOctokitToken, GithubController } from '../github.js'
import { getStub, mockReqWithCookie, toHTMLString } from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const env = container.resolve(Env)

const mockInstallationId = 123
const mockInstallationAccountLogin = 'installationAccountLogin'
const mockInstallationAccountName = 'installationAccountName'
const mockOwner = 'owner'
const mockRepo = 'repo'
const mockFullName = `${mockOwner}/${mockRepo}`
const mockBranch = 'branch'
const mockRootPath = '.'
const mockFileName = 'someFile.json'
const mockDir = 'someDir'
const mockDirPath = 'dir'

const mockToken = 'token'

const token: OAuthToken = {
  access_token: mockToken,
  expires_in: 65 * 60, // 65 minutes
  refresh_token: '',
  refresh_token_expires_in: 1,
  token_type: '',
  scope: '',
}

const installations = [
  {
    id: mockInstallationId,
    account: {
      login: mockInstallationAccountLogin,
    },
  },
  {
    id: mockInstallationId,
    account: {
      name: mockInstallationAccountName,
    },
  },
  {
    id: mockInstallationId,
  },
]

const repos = [
  {
    name: mockRepo,
    full_name: mockFullName,
    owner: {
      login: mockOwner,
    },
  },
]

const branches = [
  {
    name: mockBranch,
  },
]

const contents = [
  {
    name: mockFileName,
    path: mockFileName,
    type: 'file',
    download_url: `https://raw.githubusercontent.com/${mockFileName}`,
  },
  {
    name: mockDir,
    path: mockDirPath,
    type: 'dir',
  },
]

const nestedContents = [
  {
    name: mockFileName,
    path: `${mockDirPath}/${mockFileName}`,
    type: 'file',
    download_url: `https://raw.githubusercontent.com/${mockDirPath}/${mockFileName}`,
  },
]

const cookie = { [octokitTokenCookie]: 'someToken' }

describe('ensureOctokitToken middleware', () => {
  it('should call next when octokit token is present', () => {
    const nextSpy = sinon.spy()
    const req = mockReqWithCookie(cookie)

    ensureOctokitToken(req, req.res as express.Response, nextSpy)

    expect(nextSpy.called).to.equal(true)
  })

  it('should set redirect headers when octokit token is missing', () => {
    const nextSpy = sinon.spy()
    const statusStub = sinon.stub().returnsThis()
    const setHeaderStub = sinon.stub()

    const req = mockReqWithCookie({})
    const res = {
      status: statusStub,
      setHeader: setHeaderStub,
      end: sinon.stub(),
    } as unknown as express.Response

    ensureOctokitToken(req, res, nextSpy)

    const expectedRedirect = `https://github.com/login/oauth/authorize?client_id=${env.get('GH_CLIENT_ID')}&redirect_uri=${encodeURIComponent(`${env.get('GH_REDIRECT_ORIGIN')}/github/callback?returnUrl=/github/picker`)}`

    expect(statusStub.firstCall.args[0]).to.equal(302)
    expect(setHeaderStub.firstCall.args[0]).to.equal('HX-Redirect')
    expect(setHeaderStub.firstCall.args[1]).to.equal(expectedRedirect)
    expect(nextSpy.called).to.equal(false)
  })
})

describe('GithubController', async () => {
  let mockModelDb: ModelDb
  let mockTemplates: OntologyOpenTemplates
  let mockGithubReq: GithubRequest
  let mockGen: SvgGenerator
  let mockParse: Parser
  let mockPostHogService: PostHogService
  let mockLogger: Logger
  let mockCache: ICache
  let controller: GithubController

  beforeEach(() => {
    mockModelDb = {
      insertModel: sinon.stub().resolves(1),
    } as unknown as ModelDb

    mockTemplates = {
      OpenOntologyRoot: sinon.stub().returns('root_root'),
      githubPathLabel: ({ path }: { path: string }): JSX.Element => `githubPathLabel_${path}_githubPathLabel`,
      githubListItems: ({
        list,
        nextPageLink,
        backLink,
      }: {
        list: ListItem[]
        nextPageLink?: string
        backLink?: string
      }): JSX.Element =>
        `githubListItems_${list.map((item) => `${item.text}_${item.link}`).join('_')}_${nextPageLink}_${backLink}_githubListItems`,
      selectFolder: ({
        link,
        swapOutOfBand,
        stage,
      }: {
        link?: string
        swapOutOfBand?: boolean
        stage: string
      }): JSX.Element => `selectFolder_${link}_${swapOutOfBand}_${stage}_selectFolder`,
    } as unknown as OntologyOpenTemplates

    mockGithubReq = {
      getInstallations: sinon.stub().resolves(installations),
      getRepos: sinon.stub().resolves(repos),
      getInstallationRepos: sinon.stub().resolves(repos),
      getBranches: sinon.stub().resolves(branches),
      getContents: sinon.stub(),
      getCommit: sinon.stub().resolves({ sha: 'currentCommitSha' }),
      getAccessToken: sinon.stub().resolves(token),
      getZip: sinon.stub().resolves(readFileSync(path.resolve(__dirname, 'fixtures/simple.zip'))),
      getRepoPermissions: sinon.stub().resolves('edit'),
      getAuthenticatedUser: sinon.stub().resolves({
        login: 'testuser',
        id: 12345,
        email: 'test@example.com',
        name: 'Test User',
      }),
    } as unknown as GithubRequest

    mockGen = {
      run: sinon.stub().resolves({
        renderForMinimap: () => 'preview-svg',
      }),
    } as unknown as SvgGenerator

    mockParse = {
      validate: sinon.stub().callsFake(async (files) => files),
      parseAll: sinon.stub().resolves({}),
      unzipJsonFiles: sinon.stub(),
    } as unknown as Parser

    mockPostHogService = {
      identifyFromRequest: sinon.stub().resolves(),
      trackUploadOntology: sinon.stub().resolves(),
    } as unknown as PostHogService

    mockLogger = pino({ level: 'silent' })
    mockCache = new LRUCache(10, 1000 * 60) as ICache

    controller = new GithubController(
      mockModelDb,
      mockTemplates,
      mockGithubReq,
      mockGen,
      mockParse,
      mockPostHogService,
      mockLogger,
      mockCache
    )
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('/picker', () => {
    it('should return picker if octokit token present in cookies', async () => {
      const result = await controller.picker(mockReqWithCookie(cookie))
      if (!result) {
        throw new Error('Expected HTML response')
      }
      const html = await toHTMLString(result)

      expect(html).to.equal(`root_root`)
    })
  })

  describe('/callback', () => {
    it('should set cookie and redirect to return url from session', async () => {
      const setHeaderSpy = sinon.spy(controller, 'setHeader')

      const req = mockReqWithCookie({})
      const returnUrl = 'return.url'

      await controller.callback(req, '', returnUrl)

      const cookieSpy = req.res?.cookie as sinon.SinonSpy

      expect(cookieSpy.firstCall.args[0]).to.equal(octokitTokenCookie)
      expect(cookieSpy.firstCall.args[1]).to.equal(mockToken)
      expect(cookieSpy.firstCall.args[2]['maxAge']).to.equal((token.expires_in - 5 * 60) * 1000)

      expect(setHeaderSpy.calledWith('Refresh', `0; url=${returnUrl}`)).to.equal(true)
    })
  })
  describe('/installations', () => {
    const page = 1
    it('should return installation names in list', async () => {
      const onClickLink = `/github/repos?installationId=${mockInstallationId}&page=1`
      const nextPageLink = `/github/installations?page=${page + 1}`
      const backLink = undefined
      const result = await controller.installations(page, mockReqWithCookie(cookie))

      if (!result) {
        throw new Error('Expected HTML response')
      }

      const html = await toHTMLString(result)

      expect(html).to.equal(
        [
          `githubPathLabel_Your installations:_githubPathLabel`,
          `githubListItems_${mockInstallationAccountLogin}_${onClickLink}_${mockInstallationAccountName}_${onClickLink}_Installation ${mockInstallationId}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`,
        ].join('')
      )
    })
  })

  describe('/repos', () => {
    const page = 1
    it('should return user repo full names in list', async () => {
      const onClickLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=1`
      const nextPageLink = `/github/repos?page=${page + 1}`
      const backLink = undefined
      const result = await controller.repos(page, mockReqWithCookie(cookie))

      if (!result) {
        throw new Error('Expected HTML response')
      }

      const html = await toHTMLString(result)

      expect(html).to.equal(
        [
          `githubPathLabel_Repositories:_githubPathLabel`,
          `githubListItems_${mockFullName}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`,
        ].join('')
      )
    })

    it('should return installation repo full names in list', async () => {
      const onClickLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=1`
      const nextPageLink = `/github/repos?installationId=${mockInstallationId}&page=${page + 1}`
      const backLink = `/github/installations?page=1`
      const result = await controller.repos(page, mockReqWithCookie(cookie), mockInstallationId.toString())

      if (!result) {
        throw new Error('Expected HTML response')
      }

      const html = await toHTMLString(result)

      expect(html).to.equal(
        [
          `githubPathLabel_Repositories:_githubPathLabel`,
          `githubListItems_${mockFullName}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`,
        ].join('')
      )
    })
  })

  describe('/branches', () => {
    const page = 1
    it('should return branch names in list', async () => {
      const onClickLink = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=.&ref=${mockBranch}`
      const nextPageLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=${page + 1}`
      const backLink = undefined
      const result = await controller.branches(mockOwner, mockRepo, page, mockReqWithCookie(cookie))

      if (!result) {
        throw new Error('Expected HTML response')
      }

      const html = await toHTMLString(result)

      expect(html).to.equal(
        [
          `githubPathLabel_${mockOwner}/${mockRepo}_githubPathLabel`,
          `githubListItems_${mockBranch}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_undefined_true_branch_selectFolder`,
        ].join('')
      )
    })
  })

  describe('/contents', () => {
    it('should return contents of branch at root path in list', async () => {
      getStub(mockGithubReq, 'getContents').resolves(contents)
      const nextPageLink = undefined
      const onClickLinkFile = undefined
      const onClickLinkDir = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=${mockDirPath}&ref=${mockBranch}`
      const backLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=1`
      const selectFolderLink = `/github/directory?owner=${mockOwner}&repo=${mockRepo}&path=${mockRootPath}&ref=${mockBranch}`
      const result = await controller.contents(mockOwner, mockRepo, mockRootPath, mockBranch, mockReqWithCookie(cookie))

      if (!result) {
        throw new Error('Expected HTML response')
      }

      const html = await toHTMLString(result)

      expect(html).to.equal(
        [
          `githubPathLabel_${mockOwner}/${mockRepo}/${mockBranch}_githubPathLabel`,
          `githubListItems_📄 ${mockFileName}_${onClickLinkFile}_📂 ${mockDir}_${onClickLinkDir}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_${selectFolderLink}_true_folder_selectFolder`,
        ].join('')
      )
    })

    it('should return contents of branch at a nested path in list', async () => {
      getStub(mockGithubReq, 'getContents').resolves(nestedContents)
      const nextPageLink = undefined
      const onClickLinkFile = undefined
      const backLink = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=${mockRootPath}&ref=${mockBranch}`
      const selectFolderLink = `/github/directory?owner=${mockOwner}&repo=${mockRepo}&path=${mockDirPath}&ref=${mockBranch}`
      const result = await controller.contents(mockOwner, mockRepo, mockDirPath, mockBranch, mockReqWithCookie(cookie))

      if (!result) {
        throw new Error('Expected HTML response')
      }

      const html = await toHTMLString(result)

      expect(html).to.equal(
        [
          `githubPathLabel_${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}_githubPathLabel`,
          `githubListItems_📄 ${mockFileName}_${onClickLinkFile}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_${selectFolderLink}_true_folder_selectFolder`,
        ].join('')
      )
    })
  })

  describe('/directory', () => {
    it('should insert and redirect to valid ontology', async () => {
      getStub(mockParse, 'unzipJsonFiles').resolves([{ path: '', contents: '' }])
      const setHeaderSpy = sinon.spy(controller, 'setHeader')

      await controller.directory(mockOwner, mockRepo, mockRootPath, mockBranch, mockReqWithCookie(cookie))

      const insertModelStub = getStub(mockModelDb, 'insertModel')
      expect(insertModelStub.calledOnce).to.equal(true)

      expect(setHeaderSpy.calledWith('HX-Redirect', `/ontology/1/view`)).to.equal(true)
    })

    it('should throw error if no json files found', async () => {
      getStub(mockParse, 'unzipJsonFiles').resolves([])
      await expect(controller.directory('', '', '', '', mockReqWithCookie(cookie))).to.be.rejectedWith(
        GithubReqError,
        `No valid '.json' files found`
      )
    })
  })

  describe('/navigate', () => {
    it('valid paths and branch - should return contents of branch at a nested path in list', async () => {
      await testValidNestedPath({
        path: `${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}`,
        expectedLabel: `${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}`,
      })
    })

    it('tree in URL - should return contents of branch at a nested path in list', async () => {
      await testValidNestedPath({
        path: `${mockOwner}/${mockRepo}/tree/${mockBranch}/${mockDirPath}`,
        expectedLabel: `${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}`,
      })
    })

    it('trailing slash - should return contents of branch at a nested path in list', async () => {
      await testValidNestedPath({
        path: `${mockOwner}/${mockRepo}/tree/${mockBranch}/${mockDirPath}/`,
        expectedLabel: `${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}`,
      })
    })

    it('github domain in URL - should return contents of branch at a nested path in list', async () => {
      await testValidNestedPath({
        path: `https://github.com/${mockOwner}/${mockRepo}/tree/${mockBranch}/${mockDirPath}`,
        expectedLabel: `${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}`,
      })
    })

    it('invalid nested path but valid parent dir - should fallback and return contents of parent dir', async () => {
      const getContentsStub = getStub(mockGithubReq, 'getContents')
      getContentsStub.onCall(0).rejects(new GithubNotFound('Some error'))
      getContentsStub.onCall(1).resolves(nestedContents)

      await testValidNestedPath({
        path: `https://github.com/${mockOwner}/${mockRepo}/tree/${mockBranch}/${mockDirPath}/invalidPath`,
        expectedLabel: `${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}`,
      })
    })

    it('valid branch - should return contents of branch at root path in list', async () => {
      getStub(mockGithubReq, 'getContents').resolves(contents)
      const nextPageLink = undefined
      const onClickLinkFile = undefined
      const onClickLinkDir = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=${mockDirPath}&ref=${mockBranch}`
      const backLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=1`
      const selectFolderLink = `/github/directory?owner=${mockOwner}&repo=${mockRepo}&path=${mockRootPath}&ref=${mockBranch}`
      const result = await controller.navigate(`${mockOwner}/${mockRepo}/${mockBranch}`, mockReqWithCookie(cookie))

      if (!result) throw new Error('Expected HTML response')

      expect(await toHTMLString(result)).to.equal(
        [
          `githubPathLabel_${mockOwner}/${mockRepo}/${mockBranch}_githubPathLabel`,
          `githubListItems_📄 ${mockFileName}_${onClickLinkFile}_📂 ${mockDir}_${onClickLinkDir}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_${selectFolderLink}_true_folder_selectFolder`,
        ].join('')
      )
    })

    it('invalid path but valid branch - should fallback and return contents of branch at root path in list', async () => {
      const getContentsStub = getStub(mockGithubReq, 'getContents')
      getContentsStub.onCall(0).rejects(new GithubNotFound('Some error'))
      getContentsStub.onCall(1).resolves(contents)
      const nextPageLink = undefined
      const onClickLinkFile = undefined
      const onClickLinkDir = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=${mockDirPath}&ref=${mockBranch}`
      const backLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=1`
      const selectFolderLink = `/github/directory?owner=${mockOwner}&repo=${mockRepo}&path=${mockRootPath}&ref=${mockBranch}`
      const result = await controller.navigate(
        `${mockOwner}/${mockRepo}/${mockBranch}/invalidPath`,
        mockReqWithCookie(cookie)
      )

      if (!result) throw new Error('Expected HTML response')

      expect(await toHTMLString(result)).to.equal(
        [
          `githubPathLabel_${mockOwner}/${mockRepo}/${mockBranch}_githubPathLabel`,
          `githubListItems_📄 ${mockFileName}_${onClickLinkFile}_📂 ${mockDir}_${onClickLinkDir}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_${selectFolderLink}_true_folder_selectFolder`,
        ].join('')
      )
    })

    it('valid owner/repo - should return branch names in list', async () => {
      const onClickLink = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=.&ref=${mockBranch}`
      const nextPageLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=${2}`
      const backLink = undefined
      const result = await controller.navigate(`${mockOwner}/${mockRepo}`, mockReqWithCookie(cookie))

      if (!result) throw new Error('Expected HTML response')

      expect(await toHTMLString(result)).to.equal(
        [
          `githubPathLabel_${mockOwner}/${mockRepo}_githubPathLabel`,
          `githubListItems_${mockBranch}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_undefined_true_branch_selectFolder`,
        ].join('')
      )
    })

    it('invalid branch but valid owner/repo - should fallback and return branch names in list', async () => {
      getStub(mockGithubReq, 'getContents').onCall(0).rejects(new GithubNotFound('Some error'))

      const onClickLink = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=.&ref=${mockBranch}`
      const nextPageLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=${2}`
      const backLink = undefined
      const result = await controller.navigate(`${mockOwner}/${mockRepo}/invalidBranch`, mockReqWithCookie(cookie))

      if (!result) throw new Error('Expected HTML response')

      expect(await toHTMLString(result)).to.equal(
        [
          `githubPathLabel_${mockOwner}/${mockRepo}_githubPathLabel`,
          `githubListItems_${mockBranch}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_undefined_true_branch_selectFolder`,
        ].join('')
      )
    })

    it('should throw error if path missing owner/repo', async () => {
      await expect(controller.navigate('', mockReqWithCookie(cookie))).to.be.rejectedWith(GithubReqError, `Invalid URL`)
    })

    it('should throw error if unknown error thrown in navigation attempt', async () => {
      const unknownError = new Error('Unknown error')
      getStub(mockGithubReq, 'getContents').onCall(0).rejects(unknownError)

      await expect(
        controller.navigate(`${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}`, mockReqWithCookie(cookie))
      ).to.be.rejectedWith(unknownError)
    })
  })

  const testValidNestedPath = async ({ path, expectedLabel }: { path: string; expectedLabel: string }) => {
    getStub(mockGithubReq, 'getContents').resolves(nestedContents)
    const nextPageLink = undefined
    const onClickLinkFile = undefined
    const backLink = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=${mockRootPath}&ref=${mockBranch}`
    const selectFolderLink = `/github/directory?owner=${mockOwner}&repo=${mockRepo}&path=${mockDirPath}&ref=${mockBranch}`
    const result = await controller.navigate(path, mockReqWithCookie(cookie))

    if (!result) throw new Error('Expected HTML response')

    expect(await toHTMLString(result)).to.equal(
      [
        `githubPathLabel_${expectedLabel}_githubPathLabel`,
        `githubListItems_📄 ${mockFileName}_${onClickLinkFile}_${nextPageLink}_${backLink}_githubListItems`,
        `selectFolder_${selectFolderLink}_true_folder_selectFolder`,
      ].join('')
    )
  }
})
