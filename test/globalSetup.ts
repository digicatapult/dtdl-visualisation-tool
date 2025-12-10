import { chromium, FullConfig, Page } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TOTP } from 'otpauth'
import 'reflect-metadata'
import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { waitForSuccessResponse } from './e2e/helpers/waitForHelpers.js'
import {
  bringUpDatabaseContainer,
  buildVisualisationImage,
  startVisualisationContainer,
} from './testcontainers/testContainersSetup.js'

type UserCredentials = {
  ghTestUser: string
  ghTestPassword: string
  gh2faSecret: string
  storageStatePath: string
}

const user1: UserCredentials = {
  ghTestUser: process.env.GH_TEST_USER!,
  ghTestPassword: process.env.GH_TEST_PASSWORD!,
  gh2faSecret: process.env.GH_TEST_2FA_SECRET!,
  storageStatePath: join(tmpdir(), 'user1.json'),
}

const user2: UserCredentials = {
  ghTestUser: process.env.GH_TEST_USER_2!,
  ghTestPassword: process.env.GH_TEST_PASSWORD_2!,
  gh2faSecret: process.env.GH_TEST_2FA_SECRET_2!,
  storageStatePath: join(tmpdir(), 'user2.json'),
}

export let visualisationUIContainer: StartedTestContainer
export let visualisationUIContainer2: StartedTestContainer
export let postgresContainer: StartedTestContainer
export let visualisationImage: GenericContainer

async function globalSetup(config: FullConfig) {
  postgresContainer = await bringUpDatabaseContainer()
  visualisationImage = await buildVisualisationImage()
  // Start the visualisation container on port 3000
  visualisationUIContainer = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser',
      hostPort: 3000,
      containerPort: 3000,
      cookieSessionKeys: 'secret',
    },
    visualisationImage
  )
  // Start the visualisation container on port 3001
  visualisationUIContainer2 = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser-custom',
      hostPort: 3001,
      containerPort: 3000,
      cookieSessionKeys: 'test',
      maxOntologySize: 25,
    },
    visualisationImage
  )

  await getGithubToken(config, user1)
  await getGithubToken(config, user2)
}

const attempt2fa = async (totp: TOTP, page: Page) => {
  await page.fill('#app_totp', totp.generate())
  await page.waitForTimeout(2000)

  // Check if 2fa code already used
  if (await page.locator('.js-flash-alert').isVisible()) {
    const remaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period)
    await page.waitForTimeout(remaining * 1000)
    return attempt2fa(totp, page)
  } else {
    return
  }
}

async function getGithubToken(config: FullConfig, credentials: UserCredentials) {
  const { ghTestUser, ghTestPassword, gh2faSecret, storageStatePath } = credentials
  if (!ghTestUser || !ghTestPassword || !gh2faSecret) {
    throw new Error('Test GitHub user credentials envs required')
  }

  const { baseURL } = config.projects[0].use

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto(`${baseURL}/open`)

  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
    '/menu'
  )
  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), 'github.com/login')

  // Wait for GitHub login form
  await page.waitForSelector('#login_field')

  // Fill in the credentials and sign in
  await page.fill('#login_field', ghTestUser)
  await page.fill('#password', ghTestPassword)
  await waitForSuccessResponse(page, () => page.click('input[name="commit"]'), 'github.com/sessions/two-factor/app')
  await page.waitForSelector('#app_totp')

  const totp = new TOTP({
    issuer: 'GitHub',
    label: 'test',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: gh2faSecret,
  })
  await attempt2fa(totp, page)

  // wait for redirection
  await page.waitForTimeout(5000)

  // Sometimes GitHub requests reauthorisation
  if (!page.url().includes('/open')) {
    if (await page.getByText('too many codes').isVisible()) {
      throw new Error('GitHub login of test user requested too many times. Try again in a few minutes')
    }
    await waitForSuccessResponse(page, () => page.locator('button:has-text("authorize")').click(), '/repos')
  }

  // Store current state (cookies) for future tests
  await page.context().storageState({ path: storageStatePath })
  await context.close()
  await browser.close()
}
export default globalSetup
