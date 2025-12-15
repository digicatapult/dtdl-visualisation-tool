import { expect, Page } from '@playwright/test'
import { waitForSuccessResponse } from './waitForHelpers.js'

export async function openGithubOntology(page: Page, repoName: string, branch: string | RegExp) {
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
  const showViewable = page.locator('#github-modal').getByText('viewable')
  await expect(showViewable).toBeVisible()
  await waitForSuccessResponse(page, () => showViewable.click(), '/modal')
  const repo = page.locator('.github-list li').filter({ hasText: repoName })
  await expect(repo).toBeVisible()
  await waitForSuccessResponse(page, () => repo.click(), '/branches')
  await expect(page.locator('.github-list li').first()).toBeVisible()
  const branchName = page.locator('.github-list li').filter({ hasText: branch })
  await expect(branchName).toBeVisible()
  await waitForSuccessResponse(page, () => branchName.click(), '/contents')

  // get dtdl from github
  await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
}
