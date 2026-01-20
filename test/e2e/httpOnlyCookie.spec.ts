import { expect, test } from '@playwright/test'

import { octokitTokenCookie } from '../../src/lib/server/models/cookieNames.js'
import { visualisationUIWiremockPort } from '../globalSetup.js'
import { waitForSuccessResponse } from './helpers/waitForHelpers.js'

test.describe('httpOnly cookies', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIWiremockPort}` })

  test('OCTOKIT_TOKEN cookie is httpOnly and not readable by JavaScript', async ({ page, context }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('./open')

    await waitForSuccessResponse(
      page,
      () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
      '/menu'
    )

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')

    await page.waitForURL(/\/github\/picker/)
    await expect(page.locator('#github-modal')).toBeVisible()

    await expect
      .poll(
        async () => {
          const cookies = await context.cookies()
          return cookies.find((cookie) => cookie.name === octokitTokenCookie)?.httpOnly ?? false
        },
        { timeout: 15000 }
      )
      .toBe(true)

    const clientCookieString = await page.evaluate(() => document.cookie)
    expect(clientCookieString).not.toContain(octokitTokenCookie)
  })
})
