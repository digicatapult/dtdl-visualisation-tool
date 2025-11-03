import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

import { waitForSuccessResponse, waitForUpdateLayout, waitForUploadFile } from './helpers/waitForHelpers'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Partial load ontology with errors', () => {
  test('Should show warnings for partial load errors', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))
    await expect(page.locator('#toolbar').getByText('Open Ontology')).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

    await waitForSuccessResponse(
      page,
      () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
      '/menu'
    )
    await expect(page.locator('#main-view').getByText('Local Zip File')).toBeVisible()
    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/someInvalid.zip')
    await waitForUploadFile(page, () => page.locator('#main-view').getByText('Local Zip File').click(), filePath)
    await expect(page.locator('#mermaid-output').getByText('IdentifiedObject')).toBeVisible()

    // Test that warning appears at bottom
    await expect(page.locator('#navigation-panel-tree-warning')).toBeInViewport()

    await expect(page.locator('.nav-tree-has-child-errors')).toBeInViewport()
    await page.click('.nav-tree-has-child-errors')
    await expect(page.locator('.nav-tree-error')).toBeInViewport()
    await page.click('.nav-tree-error')
    await expect(page.locator('.error-details')).toBeInViewport()
    await expect(page.locator('.error-details')).toHaveText('Passing Error')
    await expect(page.locator('.error-details')).toHaveText('Cause')
    await expect(page.locator('.error-details')).toHaveText('Action')

    // Test that nested warning appears

    await page.waitForTimeout(10000)
  })
})
