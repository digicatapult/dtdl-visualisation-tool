import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

import { waitForSuccessResponse, waitForUpdateLayout, waitForUploadFile } from './helpers/waitForHelpers'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Upload ontology from local drive', () => {
  test('Should error success path for uploading ontology from local zip file', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))
    await expect(page.locator('#toolbar').getByText('Open Ontology')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByText('Upload New File')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')
    await expect(page.locator('#main-view').getByText('Local Zip File')).toBeVisible()

    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/simple.zip')

    await waitForUploadFile(page, () => page.locator('#main-view').getByText('Local Zip File').click(), filePath)

    await expect(page.locator('#mermaid-output').getByText('dtmi:com:example;1')).toBeVisible()

    // Render root page and test if default dtdl has loaded
    await waitForUpdateLayout(page, () => page.goto('./'))
    await expect(page.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByText('simple.zip')).toBeVisible()
    await expect(page.locator('#main-view').getByText('Viewed Today at')).toBeVisible()
  })
})
