import { expect, Page } from '@playwright/test'
import { TOTP } from 'otpauth'
import { waitForSuccessResponse } from './waitForHelpers.js'

export const attempt2fa = async (page: Page, secret: string) => {
  const totp = new TOTP({
    issuer: 'GitHub',
    label: 'test',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  })
  await page.fill('#app_totp', totp.generate())
  await page.waitForTimeout(2000)

  // Check if 2fa code already used
  if (await page.locator('.js-flash-alert').isVisible()) {
    const remaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period)
    await page.waitForTimeout(remaining * 1000)
    return attempt2fa(page, secret)
  } else {
    return
  }
}

export const attemptGHLogin = async (page: Page, user: string, password: string, secret: string) => {
  await page.waitForSelector('#login')

  // Fill in the credentials and sign in
  await page.fill('#login_field', user)
  await page.fill('#password', password)
  await waitForSuccessResponse(page, () => page.click('input[name="commit"]'), 'github.com/sessions/two-factor/app')
  await page.waitForSelector('#app_totp')

  await attempt2fa(page, secret)

  // wait for redirection
  await page.waitForTimeout(5000)

  // Sometimes GitHub requests reauthorisation
  if (!page.url().includes('/open') && !page.url().includes('/ontology')) {
    if (await page.getByText('too many codes').isVisible()) {
      throw new Error('GitHub login of test user requested too many times. Try again in a few minutes')
    }
    await waitForSuccessResponse(page, () => page.locator('button:has-text("authorize")').click(), '/repos')
  }
}

export async function openGithubOntology(
  page: Page,
  repoURL: string,
  branch: string | RegExp,
  ontologyFolder: string | RegExp
) {
  await page.goto('./open')
  await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
    '/menu'
  )
  await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()
  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')
  await page.fill('#public-github-input', repoURL)
  await waitForSuccessResponse(page, () => page.press('#public-github-input', 'Enter'), '/navigate')
  await expect(page.locator('.github-list li').first()).toBeVisible()
  await waitForSuccessResponse(
    page,
    () => page.locator('.github-list li').filter({ hasText: branch }).click(),
    '/contents'
  )
  await expect(page.locator('.github-list li').filter({ hasText: ontologyFolder })).toBeVisible()
  await waitForSuccessResponse(
    page,
    () => page.locator('.github-list li').filter({ hasText: ontologyFolder }).click(),
    '/contents'
  )

  // get dtdl from github
  await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
}
