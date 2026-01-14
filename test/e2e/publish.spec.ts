import { expect, test } from '@playwright/test'
import { visualisationUIWiremockPort } from '../globalSetup.js'
import { openEditRepo } from './helpers/openEditRepo.js'
import { waitForSuccessResponse } from './helpers/waitForHelpers.js'

test.describe('Publish ontology', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIWiremockPort}` })

  test('publish success - new branch', async ({ page }) => {
    await openEditRepo(page)
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')

    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText('displayNameEdit', { exact: true }).first().click(),
      '/update-layout'
    )

    // open publish dialog
    await waitForSuccessResponse(page, () => page.locator('#toolbar').getByText('Publish').click(), '/dialog')
    await page.locator('#publish-dialog').waitFor({ state: 'visible' })

    await page.locator('#publish-dialog').getByText('Create a new branch').click()
    await waitForSuccessResponse(page, () => page.getByRole('button', { name: 'Publish Changes' }).click(), '/publish')

    await expect(page.locator('#toast-container').filter({ hasText: 'Published successfully' })).toBeInViewport()

    await page.close()
  })

  test('publish success - existing branch', async ({ page }) => {
    await openEditRepo(page)
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')

    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText('displayNameEdit', { exact: true }).first().click(),
      '/update-layout'
    )

    // open publish dialog
    await waitForSuccessResponse(page, () => page.locator('#toolbar').getByText('Publish').click(), '/dialog')
    await page.locator('#publish-dialog').waitFor({ state: 'visible' })

    await waitForSuccessResponse(page, () => page.getByRole('button', { name: 'Publish Changes' }).click(), '/publish')

    await expect(page.locator('#toast-container').filter({ hasText: 'Published successfully' })).toBeInViewport()

    await page.close()
  })
})
