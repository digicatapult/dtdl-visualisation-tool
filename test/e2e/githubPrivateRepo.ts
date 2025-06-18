import { expect, test } from '@playwright/test'
import { waitForSuccessResponse } from './helpers/waitForHelpers'

const ghAppName = process.env.GH_APP_NAME

test.describe('Private GitHub repos', () => {
  test('can be authorised via GitHub App install', async ({ page }) => {
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
    await waitForSuccessResponse(page, () => link.click(), `github.com/apps/${ghAppName}`)
  })
})
