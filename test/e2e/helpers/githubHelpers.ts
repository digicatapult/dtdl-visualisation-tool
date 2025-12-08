import { expect, Page } from '@playwright/test'
import { waitForSuccessResponse } from './waitForHelpers.js'

export async function openGithubOntology(
  page: Page,
  repoURL: string,
  branch: string | RegExp,
  ontologyFolder: string | RegExp
) {
  await page.goto('./open')
  await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
    '/menu'
  )
  await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()
  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')
  const showViewable = page.locator('#github-modal').getByText('viewable')
  await waitForSuccessResponse(page, () => showViewable.click(), '/modal')
  await page.fill('#public-github-input', repoURL)
  await page.focus('#public-github-input')
  await waitForSuccessResponse(page, () => page.press('#public-github-input', 'Enter'), '/navigate')
  await page.waitForSelector('.github-list li')
  await expect(page.locator('.github-list li').first()).toBeVisible()
  const branchName = page.locator('.github-list li').filter({ hasText: branch })
  await waitForSuccessResponse(page, () => branchName.click(), '/contents')
  await expect(page.locator('.github-list li').filter({ hasText: ontologyFolder })).toBeVisible()
  await waitForSuccessResponse(
    page,
    () => page.locator('.github-list li').filter({ hasText: ontologyFolder }).click(),
    '/contents'
  )

  // get dtdl from github
  await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
}
