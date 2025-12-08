import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openEditRepo } from './helpers/openEditRepo.js'
import { waitForSuccessResponse } from './helpers/waitForHelpers.js'

test.describe('Publish ontology', () => {
  test('publish success', async ({ browser }) => {
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // open publish dialog
    await waitForSuccessResponse(page, () => page.locator('#toolbar').getByText('Publish').click(), '/dialog')
    await expect(page.getByRole('button', { name: 'Publish Changes' })).toBeEnabled()

    //TODO assert PR created successfully against mock GitHub API
  })
})
