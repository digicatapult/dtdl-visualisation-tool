import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { container } from 'tsyringe'

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Env } from '../../env/index.js'
import { GithubNotFound, GithubReqError } from '../../errors.js'
import { octokitTokenCookie } from '../../models/cookieNames.js'
import { OAuthToken } from '../../models/github.js'
import Parser from '../../utils/dtdl/parser.js'
import { GithubRequest } from '../../utils/githubRequest.js'
import { simpleMockDtdlObjectModel } from '../../utils/mermaid/__tests__/fixtures.js'
import { GithubController } from '../github.js'
import {
  mockCache,
  mockGenerator,
  mockLogger,
  mockPostHog,
  mockReqWithCookie,
  openOntologyMock,
  simpleMockModelDb,
  toHTMLString,
} from './helpers.js'

chai.use(chaiAsPromised)
const { expect } = chai

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const env = container.resolve(Env)

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

const getContentsStub = sinon.stub()

export const mockGithubRequest = {
  getRepos: () => Promise.resolve(repos),
  getPushableRepos: () => Promise.resolve(repos),
  getBranches: () => Promise.resolve(branches),
  getContents: getContentsStub,
  getAccessToken: () => Promise.resolve(token),
  getZip: () => Promise.resolve(readFileSync(path.resolve(__dirname, './simple.zip'))),
  getRepoPermissions: () => Promise.resolve('edit'),
  getAuthenticatedUser: sinon.stub().resolves({
    login: 'testuser',
    id: 12345,
    email: 'test@example.com',
    name: 'Test User',
  }),
} as unknown as GithubRequest

const unzipJsonFilesStub = sinon.stub()

export const mockParser = {
  validate: sinon.stub().callsFake(async (files) => files),
  parseAll: sinon.stub().resolves(simpleMockDtdlObjectModel),
  unzipJsonFiles: unzipJsonFilesStub,
} as unknown as Parser

describe('GithubController', async () => {
  const controller = new GithubController(
    simpleMockModelDb,
    openOntologyMock,
    mockGithubRequest,
    mockGenerator,
    mockParser,
    mockPostHog,
    mockLogger,
    mockCache
  )

  const assertRedirectOnNoToken = async <T>(controllerFn: () => Promise<T>, hxRedirect: boolean = true) => {
    const setHeaderSpy = sinon.spy(controller, 'setHeader')
    const setStatusSpy = sinon.spy(controller, 'setStatus')

    await controllerFn()

    const redirect = encodeURIComponent(`${env.get('GH_REDIRECT_ORIGIN')}/github/callback?returnUrl=/github/picker`)

    expect(setHeaderSpy.firstCall.args[0]).to.equal(hxRedirect ? 'HX-Redirect' : 'Location')
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

      expect(html).to.equal(`root_/github/repos?page=1&type=view_/github/repos?page=1&type=edit_root`)
    })

    it('should redirect if octokit token NOT present in cookies', async () => {
      await assertRedirectOnNoToken(() => controller.picker(mockReqWithCookie({})), false)
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

  describe('/repos', () => {
    const page = 1
    it('should return repo full names in list', async () => {
      const onClickLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=1`
      const nextPageLink = `/github/repos?page=${page + 1}&type=view`
      const backLink = undefined
      const result = await controller.repos(page, mockReqWithCookie(cookie))

      if (!result) {
        throw new Error('Expected HTML response')
      }

      const html = await toHTMLString(result)

      expect(html).to.equal(
        [`githubListItems_${mockFullName}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`].join('')
      )
    })

    it('should redirect if octokit token NOT present in cookies', async () => {
      await assertRedirectOnNoToken(() => controller.repos(page, mockReqWithCookie({})))
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
          `githubPathLabel_${mockOwner}/${mockRepo}_githubPathLabel`,
          `githubListItems_${mockBranch}_${onClickLink}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_undefined_true_branch_selectFolder`,
        ].join('')
      )
    })

    it('should redirect if octokit token NOT present in cookies', async () => {
      await assertRedirectOnNoToken(() => controller.branches(mockOwner, mockRepo, page, mockReqWithCookie({})))
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
          `githubPathLabel_${mockOwner}/${mockRepo}/${mockBranch}_githubPathLabel`,
          `githubListItems_📄 ${mockFileName}_${onClickLinkFile}_📂 ${mockDir}_${onClickLinkDir}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_${selectFolderLink}_true_folder_selectFolder`,
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
          `githubPathLabel_${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}_githubPathLabel`,
          `githubListItems_📄 ${mockFileName}_${onClickLinkFile}_${nextPageLink}_${backLink}_githubListItems`,
          `selectFolder_${selectFolderLink}_true_folder_selectFolder`,
        ].join('')
      )
    })

    it('should redirect if octokit token NOT present in cookies', async () => {
      await assertRedirectOnNoToken(() =>
        controller.contents(mockOwner, mockRepo, mockDirPath, mockBranch, mockReqWithCookie({}))
      )
    })
  })

  describe('/directory', () => {
    it('should insert and redirect to valid ontology', async () => {
      unzipJsonFilesStub.resolves([{ path: '', contents: '' }])
      const setHeaderSpy = sinon.spy(controller, 'setHeader')
      const insertModel = sinon.spy(simpleMockModelDb, 'insertModel')

      await controller.directory(mockOwner, mockRepo, mockRootPath, mockBranch, mockReqWithCookie(cookie))

      // assert model and file inserted
      expect(insertModel.calledOnce).to.equal(true)

      expect(setHeaderSpy.calledWith('HX-Redirect', `/ontology/1/view`)).to.equal(true)
    })

    it('should throw error if no json files found', async () => {
      unzipJsonFilesStub.resolves([])
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
      getContentsStub.onCall(0).rejects(new GithubNotFound('Some error'))
      getContentsStub.onCall(1).resolves(nestedContents)

      await testValidNestedPath({
        path: `https://github.com/${mockOwner}/${mockRepo}/tree/${mockBranch}/${mockDirPath}/invalidPath`,
        expectedLabel: `${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}`,
      })
    })

    it('valid branch - should return contents of branch at root path in list', async () => {
      getContentsStub.resolves(contents)
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
      const backLink = `/github/repos?page=1`
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
      getContentsStub.onCall(0).rejects(new GithubNotFound('Some error'))

      const onClickLink = `/github/contents?owner=${mockOwner}&repo=${mockRepo}&path=.&ref=${mockBranch}`
      const nextPageLink = `/github/branches?owner=${mockOwner}&repo=${mockRepo}&page=${2}`
      const backLink = `/github/repos?page=1`
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

    it('should redirect if octokit token NOT present in cookies', async () => {
      await assertRedirectOnNoToken(() => controller.navigate(`${mockOwner}/${mockRepo}`, mockReqWithCookie({})))
    })

    it('should throw error if unknown error thrown in navigation attempt', async () => {
      const unknownError = new Error('Unknown error')
      getContentsStub.onCall(0).rejects(unknownError)

      await expect(
        controller.navigate(`${mockOwner}/${mockRepo}/${mockBranch}/${mockDirPath}`, mockReqWithCookie(cookie))
      ).to.be.rejectedWith(unknownError)
    })
  })

  const testValidNestedPath = async ({ path, expectedLabel }: { path: string; expectedLabel: string }) => {
    getContentsStub.resolves(nestedContents)
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
