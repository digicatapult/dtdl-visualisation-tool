import { expect, test } from '@playwright/test'

import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('Upload ontology from GitHub via OAuth', () => {
  test('Success path for uploading ontology from private Github repo + from public Github repo', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))
    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/repos')

    // click test repo
    await expect(page.locator('.github-list li').first()).toBeVisible()
    await waitForSuccessResponse(
      page,
      () =>
        page
          .locator('.github-list li')
          .filter({ hasText: /^digicatapult\/dtdl-test-fixtures$/ })
          .click(),
      '/branches'
    )

    // click main branch
    await expect(page.locator('.github-list li').first()).toBeVisible()
    await waitForSuccessResponse(
      page,
      () =>
        page
          .locator('.github-list li')
          .filter({ hasText: /^main$/ })
          .click(),
      '/contents'
    )

    // get dtdl from github
    await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
    await expect(page.locator('#mermaid-output').getByText('dtmi:com:example;1')).toBeVisible()

    // test public repo
    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByText('Upload New File')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')
    await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/repos')

    // enter a public repo
    await expect(page.locator('.github-list li').first()).toBeVisible()
    await page.fill('#public-github-input', 'digicatapult/dtdl-visualisation-tool')
    await waitForSuccessResponse(page, () => page.press('#public-github-input', 'Enter'), '/branches')

    // click main branch
    await expect(page.locator('.github-list li').filter({ hasText: /^main$/ })).toBeVisible()
    await waitForSuccessResponse(
      page,
      () =>
        page
          .locator('.github-list li')
          .filter({ hasText: /^main$/ })
          .click(),
      '/contents'
    )

    // click /sample
    await expect(page.locator('.github-list li').filter({ hasText: 'sample' })).toBeVisible()
    await waitForSuccessResponse(
      page,
      () => page.locator('.github-list li').filter({ hasText: 'sample' }).click(),
      '/contents'
    )

    // get dtdl from github
    await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
    await expect(page.locator('#mermaid-output').getByText('IdentifiedObject')).toBeVisible()
  })
})
