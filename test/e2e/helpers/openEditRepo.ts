import { expect, Page } from '@playwright/test'
import { waitForSuccessResponse } from './waitForHelpers.js'

export const openEditRepo = async (page: Page) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('./')
  await page.waitForSelector(`text='Terminal'`)

  await page.goto('./open')
  await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
    '/menu'
  )
  await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')

  // open dtdl test fixture
  const installation = page.locator('.github-list li').filter({ hasText: /digicatapult$/ })
  await expect(installation).toBeVisible()
  await waitForSuccessResponse(page, () => installation.click(), '/repos')

  const repo = page.locator('.github-list li').filter({ hasText: /digicatapult\/dtdl-test-fixtures$/ })
  await expect(repo).toBeVisible()
  await waitForSuccessResponse(page, () => repo.click(), '/branches')

  // Add a small wait for Webkit rendering
  await page.waitForTimeout(1000)

  // click test/dtdl branch
  const branchName = page.locator('.github-list li').filter({ hasText: /^main$/ })
  await expect(branchName).toBeVisible()
  await branchName.scrollIntoViewIfNeeded()
  await waitForSuccessResponse(page, () => branchName.click(), '/contents')

  // click edit
  const dirName = page.locator('.github-list li').filter({ hasText: /edit$/ })
  await expect(dirName).toBeVisible()
  await dirName.scrollIntoViewIfNeeded()
  await waitForSuccessResponse(page, () => dirName.click(), '/contents')

  // get dtdl from github
  await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
  await expect(page.locator('#mermaid-output').getByText('displayNameEdit', { exact: true })).toBeVisible()
}
