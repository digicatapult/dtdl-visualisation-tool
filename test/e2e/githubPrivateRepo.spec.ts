import { expect, test } from '@playwright/test'
import { waitForSuccessResponse } from './helpers/waitForHelpers'

const ghAppName = process.env.GH_APP_NAME

test.describe('Private GitHub repos', () => {
  test('can be authorised via GitHub App install', async ({ page, context }) => {
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
      await githubAppPage.getByText('Install & Authorize', { exact: true }).click()

      // assert redirect
      await expect(githubAppPage).toHaveURL(`http://localhost:3000/open`)
      await expect(githubAppPage.locator('.github-list >> text=/\\/private/')).toBeVisible()
    } else {
      // assert private repo is in the list
      await expect(page.locator('.github-list >> text=/\\/private/')).toBeVisible()
    }
  })
})
