import { expect, test } from '@playwright/test'

import { visualisationUIWiremockPort } from '../globalSetup'
import { getValidationMessage } from './helpers/genericHelpers'
import { waitFor404Response, waitForSuccessResponse } from './helpers/waitForHelpers'

test.describe('Public GitHub URL input validation', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIWiremockPort}` })

  test('Success + error responses for different URLs', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./open')
    await waitForSuccessResponse(
      page,
      () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
      '/menu'
    )
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')

    const showViewable = page.locator('#github-modal').getByText('viewable')
    await waitForSuccessResponse(page, () => showViewable.click(), '/modal')

    const testPaths = [
      {
        paths: [
          'https://www.github.com/digicatapult/dtdl-visualisation-tool',
          'https://github.com/digicatapult/dtdl-visualisation-tool',
          'https://github.com/digicatapult/dtdl-visualisation-tool/extra/path',
          'https://www.github.com/digicatapult/dtdl-visualisation-tool/extra/path',
          'https://www.github.com/digicatapult/dtdl-visualisation-tool/tree/main/extra/path',
          'digicatapult/dtdl-visualisation-tool',
        ],
        handler: waitForSuccessResponse,
      },
      {
        paths: [
          'https://github.com/digicatapult/dtdl-visualisation-tool-fake/',
          'digicatapult/dtdl-visualisation-tool-fake',
        ],
        handler: waitFor404Response,
      },
      {
        paths: [
          'https://wwww.github.com/digicatapult/dtdl-visualisation-tool',
          'https://githubfake.com/digicatapult/dtdl-visualisation-tool',
        ],
        handler: getValidationMessage,
      },
    ]

    for (const { paths, handler } of testPaths) {
      for (const path of paths) {
        await page.fill('#public-github-input', path)
        if (handler === waitForSuccessResponse) {
          await handler(page, () => page.press('#public-github-input', 'Enter'), '/navigate')
        } else if (handler === waitFor404Response) {
          await handler(page, () => page.press('#public-github-input', 'Enter'), '/navigate')
          await expect(page.locator('#toast-container').filter({ hasText: 'GitHub Not Found Error' })).toBeInViewport()
        } else if (handler === getValidationMessage) {
          expect(await getValidationMessage(page, '#public-github-input')).toBe('invalid owner/repo combination or url')
        }
      }
    }

    await page.close()
  })
})
