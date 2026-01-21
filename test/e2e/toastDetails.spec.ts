import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

import { visualisationUIWiremockPort } from '../globalSetup'
import { waitForSuccessResponse, waitForUpdateLayout, waitForUploadFile } from './helpers/waitForHelpers'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Upload ontology from local drive', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIWiremockPort}` })

  test('Should error + success path for uploading ontology from local zip file', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))
    await expect(page.locator('#toolbar').getByText('Open')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

    await waitForSuccessResponse(
      page,
      () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
      '/menu'
    )
    await expect(page.locator('#main-view').getByText('Local Zip File')).toBeVisible()

    // Upload ontology and wait for file to load dtdl
    const filePath = path.join(__dirname, 'fixtures/error.zip')

    const warningSVGResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/warning.svg') && resp.status() === 200
    )
    await waitForUploadFile(page, () => page.locator('#main-view').getByText('Local Zip File').click(), filePath)
    await warningSVGResponsePromise

    await expect(page.getByText('Unable to parse any file. Open details:')).toBeVisible()
    await page.locator('#toast-container').getByText('Unable to parse any file. Open details:').click()

    await expect(page.getByText('Top-level JSON object has no @context specifier')).toBeVisible()

    // check no request sent if no file selected
    let uploadRequestMade = false
    page.on('request', (request) => {
      if (request.url().includes('/open/') && request.method() === 'POST') {
        uploadRequestMade = true
      }
    })

    await waitForUploadFile(page, () => page.locator('#main-view').getByText('Local Zip File').click(), [])
    expect(uploadRequestMade).toBe(false)
  })
})
