import { Page, test } from '@playwright/test'
import { TOTP } from 'otpauth'
import { visualisationUIGithubPort } from '../globalSetup'
import { waitForSuccessResponse } from './helpers/waitForHelpers'

test.describe('real GitHub', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIGithubPort}` })

  test('login', async ({ page }) => {
    const ghTestUser = process.env.GH_TEST_USER!
    const ghTestPassword = process.env.GH_TEST_PASSWORD!
    const gh2faSecret = process.env.GH_TEST_2FA_SECRET!

    if (!ghTestUser || !ghTestPassword || !gh2faSecret) {
      throw new Error('Test GitHub user credentials envs required')
    }

    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`/open`)

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
  })
})

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
