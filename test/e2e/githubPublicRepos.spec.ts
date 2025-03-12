import { expect, test } from '@playwright/test'

import { waitFor400Response, waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('Upload ontology from GitHub via OAuth', () => {
  test('Success path for uploading ontology from private Github repo + from public Github repo', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./open'))
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/repos')

    // click first of test users repos
    await expect(page.locator('.github-list li').first()).toBeVisible()
    const testPaths = [
      {
        paths: [
          'https://www.github.com/digicatapult/dtdl-visualisation-tool',
          'https://github.com/digicatapult/dtdl-visualisation-tool',
          'https://github.com/digicatapult/dtdl-visualisation-tool/extra/path',
          'https://www.github.com/digicatapult/dtdl-visualisation-tool/extra/path',
          'digicatapult/dtdl-visualisation-tool',
        ],
        handler: waitForSuccessResponse,
      },
      {
        paths: [
          'https://wwww.github.com/digicatapult/dtdl-visualisation-tool',
          'https://githubfake.com/digicatapult/dtdl-visualisation-tool',
          'https://github.com/digicatapult/dtdl-visualisation-tool-fake/',
          'digicatapult/dtdl-visualisation-tool-fake',
        ],
        handler: waitFor400Response,
      },
    ]

    for (const { paths, handler } of testPaths) {
      for (const path of paths) {
        await page.fill('#public-github-input', path)
        await handler(page, () => page.press('#public-github-input', 'Enter'), '/branches')
        if (handler === waitForSuccessResponse) {
          await expect(page.locator('.github-list li').filter({ hasText: /^<$/ })).toBeVisible()
          await waitForSuccessResponse(
            page,
            () => page.locator('.github-list li').filter({ hasText: /^<$/ }).click(),
            '/repos'
          )
        } else {
          await expect(page.locator('#toast-container').filter({ hasText: 'GitHub Request Error' })).toBeInViewport()
        }
      }
    }
  })
})
