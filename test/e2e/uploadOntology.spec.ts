import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

import { waitForSuccessResponse, waitForUpdateLayout, waitForUploadFile } from './helpers/waitForHelpers'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Upload ontology from local drive', () => {
  test('Should error + success path for uploading ontology from local zip files', async ({ page }) => {
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

    // Upload ontology and wait for file to load dtdl
    // Error zip
    let filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/error.zip')

    const warningSVGResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/warning.svg') && resp.status() === 200
    )
    await waitForUploadFile(page, () => page.locator('#main-view').getByText('Local Zip File').click(), filePath)
    await warningSVGResponsePromise

    await expect(page.getByText('Modelling error')).toBeVisible()

    // All valid zip
    filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/simple.zip')

    await waitForUploadFile(page, () => page.locator('#main-view').getByText('Local Zip File').click(), filePath)

    await expect(page.locator('#mermaid-output').getByText('dtmi:com:example;1')).toBeVisible()
    await waitForUpdateLayout(page, () => page.getByLabel('Diagram Type').selectOption('classDiagram'))
    await expect(page.locator('#mermaid-output #mermaid-svg')).toHaveClass('classDiagram')

    // Some valid/invalid zip
    await page.goto('./open')
    await waitForSuccessResponse(
      page,
      () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
      '/menu'
    )
    filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/someInvalid.zip')
    await waitForUploadFile(page, () => page.locator('#main-view').getByText('Local Zip File').click(), filePath)
    await expect(page.locator('#mermaid-output').getByText('IdentifiedObject')).toBeVisible()
    await expect(page.locator('#navigation-panel-tree-warning')).toBeInViewport()

    // Test default dtdl still loads
    await waitForUpdateLayout(page, () => page.goto('./'))
    await expect(page.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()

    // Check classDiagram functionality
    await waitForUpdateLayout(page, () => page.getByLabel('Diagram Type').selectOption('classDiagram'))
    await expect(page.locator('#mermaid-output #mermaid-svg')).toHaveClass('classDiagram')
  })
})
