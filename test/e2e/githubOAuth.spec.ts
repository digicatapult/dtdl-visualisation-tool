import { expect, test } from '@playwright/test'
import { TOTP } from 'otpauth'

import { octokitTokenCookie } from '../../src/lib/server/models/cookieNames'
import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

const ghTestUser = process.env.GH_TEST_USER
const ghTestPassword = process.env.GH_TEST_PASSWORD
const gh2faSecret = process.env.GH_TEST_2FA_SECRET

if (!ghTestUser || !ghTestPassword || !gh2faSecret) throw new Error('Test GitHub user credentials required')

const totp = new TOTP({
  issuer: 'GitHub',
  label: 'test',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: gh2faSecret,
})

test.describe('Upload ontology from GitHub via OAuth', () => {
  test.only('Success path for uploading ontology from private Github repo + from public Github repo', async ({
    context,
  }) => {
    test.setTimeout(120000)

    await context.addCookies([
      {
        name: octokitTokenCookie,
        value: process.env.OCTOKIT_TOKEN!,
        path: '/',
        domain: '127.0.0.1',
        secure: false,
      },
    ])
    const page = await context.newPage()

    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))

    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), 'github.com/login')

    // click first of test users repos
    await expect(page.locator('.github-list li').first()).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('.github-list li').first().click(), '/branches')

    // click main branch, 1st option is back button
    await expect(page.locator('.github-list li').nth(1)).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('.github-list li').nth(1).click(), '/contents')

    // get dtdl from github
    await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
    await expect(page.locator('#mermaid-output').getByText('dtmi:com:example;1')).toBeVisible()

    // test public repo
    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByText('Upload New File')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')
    await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/repos')

    // enter a public repo
    await expect(page.locator('.github-list li').first()).toBeVisible()
    await page.fill('#public-github-input', 'digicatapult/dtdl-visualisation-tool')
    await waitForSuccessResponse(page, () => page.press('#public-github-input', 'Enter'), '/branches')

    // click main branch
    await expect(page.locator('.github-list li').filter({ hasText: /^main$/ })).toBeVisible()
    await waitForSuccessResponse(
      page,
      () =>
        page
          .locator('.github-list li')
          .filter({ hasText: /^main$/ })
          .click(),
      '/contents'
    )

    // click /sample
    await expect(page.locator('.github-list li').filter({ hasText: 'sample' })).toBeVisible()
    await waitForSuccessResponse(
      page,
      () => page.locator('.github-list li').filter({ hasText: 'sample' }).click(),
      '/contents'
    )

    // get dtdl from github
    await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
    await expect(page.locator('#mermaid-output').getByText('IdentifiedObject')).toBeVisible()
  })
})
