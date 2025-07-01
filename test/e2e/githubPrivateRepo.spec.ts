import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForSuccessResponse } from './helpers/waitForHelpers'

const ghAppName = process.env.GH_APP_NAME

test.describe('Private GitHub repos', () => {
  test('authorise all private repos via GitHub App install', async ({ browser }) => {
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./open')
    await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

    await waitForSuccessResponse(
      page,
      () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
      '/menu'
    )
    await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')

    const link = page.locator('.authorise-link')
    await expect(link).toBeVisible()

    // go to newly opened tab
    const [githubAppPage] = await Promise.all([context.waitForEvent('page'), link.click()])
    await githubAppPage.waitForLoadState()
    await expect(githubAppPage).toHaveURL(`https://github.com/apps/${ghAppName}`)

    const install = githubAppPage.locator('text="Install"')
    // install app if not already installed
    if ((await install.count()) > 0) {
      await install.click()
      await githubAppPage.locator('a[href*="target_type=User"]').click()
      await githubAppPage.locator('button:has-text("Install")').click()

      // reload original tab
      await page.reload()
      await waitForSuccessResponse(
        page,
        () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
        '/menu'
      )
      await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')
    }
    await expect(page.locator('.github-list').getByText('private_with_')).toBeVisible()
  })
})
