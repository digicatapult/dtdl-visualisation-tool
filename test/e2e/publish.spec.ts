import { expect, test } from '@playwright/test'
import { visualisationUIWiremockPort } from '../globalSetup.js'
import { openEditRepo } from './helpers/openEditRepo.js'
import { waitForSuccessResponse } from './helpers/waitForHelpers.js'

test.describe('Publish ontology', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIWiremockPort}` })

  test('publish success - new/existing branch', async ({ page }) => {
    await openEditRepo(page)

    // open publish dialog
    await waitForSuccessResponse(page, () => page.locator('#toolbar').getByText('Publish').click(), '/dialog')
    await expect(page.getByRole('button', { name: 'Publish Changes' })).toBeEnabled()

    // TODO assert PR created successfully against mock GitHub API
    // TODO assert committed to existing branch successfully against mock GitHub API

    await page.close()
  })
})
