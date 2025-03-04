import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Open Ontology from recently visited', () => {
  test('open ontology that can be edited', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))
    await expect(page.locator('#toolbar').getByText('Open Ontology')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByText('Viewed Today at ')).toBeVisible()
  })
  test('open ontology than can be edited and check edit function works', async ({ page }) => {})
})
