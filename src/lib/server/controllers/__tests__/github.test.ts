import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { container } from 'tsyringe'

import { Env } from '../../env/index.js'
import { UploadError } from '../../errors.js'
import { octokitTokenCookie } from '../../models/cookieNames.js'
import { OAuthToken } from '../../models/github.js'
import { GithubRequest } from '../../utils/githubRequest.js'
import { GithubController } from '../github.js'
import {
  mockCache,
  mockDb,
  mockGenerator,
  mockLogger,
  mockReqWithCookie,
  openOntologyMock,
  toHTMLString,
} from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

const env = container.resolve(Env)

const mockOwner = 'owner'
const mockRepo = 'repo'
const mockFullName = `${mockOwner}/${mockRepo}`
const mockBranch = 'branch'
const mockRootPath = '.'
const mockFile = 'someFile.json'
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
    name: mockFile,
    path: 'file.json',
    type: 'file',
    download_url: 'https://raw.githubusercontent.com/file.json',
  },
  {
    name: mockDir,
    path: mockDirPath,
    type: 'dir',
  },
]

const nestedContents = [
  {
    name: mockFile,
    path: `${mockDirPath}/file.json`,
    type: 'file',
    download_url: `https://raw.githubusercontent.com/${mockDirPath}/file.json`,
  },
]

const dtdl = (id: string) =>
  JSON.stringify({
    '@context': ['dtmi:dtdl:context;3'],
    '@id': `dtmi:com:${id};1`,
    '@type': 'Interface',
  })

const cookie = { [octokitTokenCookie]: 'someToken' }

const getContentsStub = sinon.stub()

export const mockGithubRequest = {
  getRepos: () => Promise.resolve(repos),
  getBranches: () => Promise.resolve(branches),
  getContents: getContentsStub,
  getAccessToken: () => Promise.resolve(token),
} as unknown as GithubRequest

describe('GithubController', async () => {
  const controller = new GithubController(
    mockDb,
    openOntologyMock,
    mockGithubRequest,
    mockGenerator,
    mockLogger,
    mockCache
  )

  const assertNoTokenRedirect = async <T>(controllerFn: () => Promise<T>) => {
    const setHeaderSpy = sinon.spy(controller, 'setHeader')
    const setStatusSpy = sinon.spy(controller, 'setStatus')

    await controllerFn()

    const redirect = encodeURIComponent(`${env.get('GH_REDIRECT_ORIGIN')}/github/callback?returnUrl=/github/picker`)

    expect(setHeaderSpy.firstCall.args[0]).to.equal('HX-Redirect')
    expect(setHeaderSpy.firstCall.args[1]).to.equal(
      `https://github.com/login/oauth/authorize?client_id=${env.get('GH_CLIENT_ID')}&redirect_uri=${redirect}`
    )
    expect(setStatusSpy.calledWith(302)).to.equal(true)
  }

  afterEach(() => {
    sinon.restore()
    getContentsStub.reset()
  })

  describe('/picker', () => {
    it('should return picker if octokit token present in cookies', async () => {
      const result = await controller.picker(mockReqWithCookie(cookie))
      if (!result) {
        throw new Error('Expected HTML response')
      }
      const html = await toHTMLString(result)

      expect(html).to.equal(`root_/github/repos?page=1_root`)
    })

    it('should redirect if octokit token NOT present in cookies', async () => {
      await assertNoTokenRedirect(() => controller.picker(mockReqWithCookie({})))
    })
  })

  describe('/callback', () => {
    it('should redirect to return url from session', async () => {
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const req = mockReqWithCookie({})
      const returnUrl = 'return.url'

      await controller.callback('', returnUrl, req)

      const cookieSpy = req.res?.cookie as sinon.SinonSpy

      expect(cookieSpy.firstCall.args[0]).to.equal(octokitTokenCookie)
      expect(cookieSpy.firstCall.args[1]).to.equal(mockToken)
      expect(cookieSpy.firstCall.args[2]['maxAge']).to.equal((token.expires_in - 5 * 60) * 1000)

      expect(setHeaderSpy.calledWith('Refresh', `0; url=${returnUrl}`)).to.equal(true)
    })
  })

  describe('/repos', () => {
    const page = 1
    it('should return repo full names in list', async () => {
      const onClickLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=1`
      const nextPageLink = `/github/repos?page=${page + 1}`
      const backLink = undefined
      const result = await controller.repos(page, mockReqWithCookie(cookie))

      if (!result) {
        throw new Error('Expected HTML response')
      }

      const html = await toHTMLString(result)

      expect(html).to.equal(
        `githubListItems_${mockFullName}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`
      )
    })

    it('should redirect if octokit token NOT present in cookies', async () => {
      await assertNoTokenRedirect(() => controller.repos(page, mockReqWithCookie({})))
    })
  })

  describe('/branches', () => {
    const page = 1
    it('should return branch names in list', async () => {
      const onClickLink = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=.&ref=${mockBranch}`
      const nextPageLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=${page + 1}`
      const backLink = `/github/repos?page=1`
      const result = await controller.branches(mockOwner, mockRepo, page, mockReqWithCookie(cookie))

      if (!result) {
        throw new Error('Expected HTML response')
      }

      const html = await toHTMLString(result)

      expect(html).to.equal(
        [
          `githubListItems_${mockBranch}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_undefined_true_selectFolder`,
        ].join('')
      )
    })

    it('should redirect if octokit token NOT present in cookies', async () => {
      await assertNoTokenRedirect(() => controller.branches(mockOwner, mockRepo, page, mockReqWithCookie({})))
    })
  })

  describe('/contents', () => {
    it('should return contents of branch at root path in list', async () => {
      getContentsStub.resolves(contents)
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
          `githubListItems_📄 ${mockFile}_${onClickLinkFile}_📂 ${mockDir}_${onClickLinkDir}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_${selectFolderLink}_true_selectFolder`,
        ].join('')
      )
    })

    it('should return contents of branch at a nested path in list', async () => {
      getContentsStub.resolves(nestedContents)
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
          `githubListItems_📄 ${mockFile}_${onClickLinkFile}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_${selectFolderLink}_true_selectFolder`,
        ].join('')
      )
    })

    it('should redirect if octokit token NOT present in cookies', async () => {
      await assertNoTokenRedirect(() =>
        controller.contents(mockOwner, mockRepo, mockDirPath, mockBranch, mockReqWithCookie({}))
      )
    })
  })

  describe('/directory', () => {
    it('should insert and redirect to valid ontology', async () => {
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const insertDb = sinon.spy(mockDb, 'insert')

      // get root then nested contents
      getContentsStub.onCall(0).resolves(contents)
      getContentsStub.onCall(1).resolves(nestedContents)

      // mock file download
      const fetchStub = sinon.stub(global, 'fetch')
      fetchStub.onCall(0).resolves({
        arrayBuffer: () => Promise.resolve(Buffer.from(dtdl('example0'))),
      } as unknown as Response)
      fetchStub.onCall(1).resolves({
        arrayBuffer: () => Promise.resolve(Buffer.from(dtdl('example1'))),
      } as unknown as Response)

      await controller.directory(mockOwner, mockRepo, mockRootPath, mockBranch, mockReqWithCookie(cookie))

      expect(insertDb.calledOnce).to.equal(true)
      expect(setHeaderSpy.calledWith('HX-Redirect', `/ontology/1/view`)).to.equal(true)
    })

    it('should throw error if no json files found', async () => {
      getContentsStub.resolves([])
      await expect(controller.directory('', '', '', '', mockReqWithCookie(cookie))).to.be.rejectedWith(
        UploadError,
        `No '.json' files found`
      )
    })

    it('should throw error if sum of file sizes is over upload size limit', async () => {
      // get root then nested contents
      getContentsStub.onCall(0).resolves(contents)
      getContentsStub.onCall(1).resolves(nestedContents)

      const fileSize = (env.get('UPLOAD_LIMIT_MB') / 2) * 1024 * 1024 + 1 // two files of this size is just over limit

      sinon.stub(global, 'fetch').resolves({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(fileSize)),
      } as unknown as Response)

      await expect(controller.directory('', '', '', '', mockReqWithCookie(cookie))).to.be.rejectedWith(
        UploadError,
        `Total upload must be less than ${env.get('UPLOAD_LIMIT_MB')}MB`
      )
    })
  })
})
