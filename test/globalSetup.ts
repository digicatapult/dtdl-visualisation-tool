import { FullConfig, Page, chromium } from '@playwright/test'
import { TOTP } from 'otpauth'
import 'reflect-metadata'
import { waitForSuccessResponse, waitForUpdateLayout } from './e2e/helpers/waitForHelpers.js'
import {
  bringUpDatabaseContainer,
  buildVisualisationImage,
  startVisualisationContainer,
} from './testcontainers/testContainersSetup.js'

async function globalSetup(config: FullConfig) {
  await bringUpDatabaseContainer()
  await buildVisualisationImage()
  // Start the visualisation container on port 3000
  await startVisualisationContainer({
    containerName: 'dtdl-visualiser',
    hostPort: 3000,
    containerPort: 3000,
    cookieSessionKeys: 'secret',
  })
  // Start the visualisation container on port 3001
  await startVisualisationContainer({
    containerName: 'dtdl-visualiser-custom',
    hostPort: 3001,
    containerPort: 3000,
    cookieSessionKeys: 'test',
    maxOntologySize: 10,
  })
  await getGithubToken(config)
}

const ghTestUser = process.env.GH_TEST_USER
const ghTestPassword = process.env.GH_TEST_PASSWORD
const gh2faSecret = process.env.GH_TEST_2FA_SECRET

const totp = new TOTP({
  issuer: 'GitHub',
  label: 'test',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: gh2faSecret,
})

const attempt2fa = async (page: Page) => {
  await page.fill('#app_totp', totp.generate())
  await page.waitForTimeout(2000)

  // Check if 2fa code already used
  if (await page.locator('.js-flash-alert').isVisible()) {
    const remaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period)
    await page.waitForTimeout(remaining * 1000)
    return attempt2fa(page)
  } else {
    return
  }
}

async function getGithubToken(config: FullConfig) {
  if (!ghTestUser || !ghTestPassword || !gh2faSecret) {
    throw new Error('Test GitHub user credentials required')
  }
  const { baseURL, storageState } = config.projects[0].use

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Set viewport and navigate to your app
  await page.setViewportSize({ width: 1920, height: 1080 })
  await waitForUpdateLayout(page, () => page.goto(baseURL!))

  await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
    '/menu'
  )
  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), 'github.com/login')

  // Wait for GitHub login form
  await page.waitForSelector('#login')

  // Fill in the credentials and sign in
  await page.fill('#login_field', ghTestUser)
  await page.fill('#password', ghTestPassword)
  await waitForSuccessResponse(page, () => page.click('input[name="commit"]'), 'github.com/sessions/two-factor/app')
  await page.waitForSelector('#app_totp')

  await attempt2fa(page)

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
  await page.context().storageState({ path: storageState as string })

  await browser.close()
}

export default globalSetup
