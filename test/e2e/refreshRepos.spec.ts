import { expect, Page, test } from '@playwright/test'

import { visualisationUIWiremockPort } from '../globalSetup.js'
import { waitForSuccessResponse } from './helpers/waitForHelpers.js'

async function setWiremockScenarioState(scenarioName: string, state: string): Promise<void> {
  await fetch(`http://localhost:8080/__admin/scenarios/${scenarioName}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  })
}

async function resetWiremockScenarios(): Promise<void> {
  await fetch('http://localhost:8080/__admin/scenarios/reset', {
    method: 'POST',
  })
}

async function navigateToGithubRepoList(page: Page) {
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
  await expect(page.locator('.github-list li').first()).toBeVisible()
}

test.describe('Refresh Repositories Button', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIWiremockPort}` })

  test.beforeEach(async () => {
    await resetWiremockScenarios()
  })

  test.afterEach(async () => {
    await resetWiremockScenarios()
  })

  test('Refresh button is rendered and visible on repository list', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await navigateToGithubRepoList(page)

    const refreshButton = page.locator('#refresh-repos-button')
    await expect(refreshButton).toBeVisible()
    await expect(refreshButton).toHaveText('Refresh')
    await expect(refreshButton).toBeEnabled()
    await expect(refreshButton).toHaveAttribute('title', 'Refresh repository list')
  })

  test('Refresh button is disabled on installations page (not on repos)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./open')
    await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

    await waitForSuccessResponse(
      page,
      () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
      '/menu'
    )
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')

    await expect(page.locator('.github-list li').first()).toBeVisible()

    const refreshButton = page.locator('#refresh-repos-button')
    await expect(refreshButton).toBeVisible()
    await expect(refreshButton).toBeDisabled()
    await expect(refreshButton).toHaveAttribute('title', 'Navigate to repositories to refresh')
  })

  test('Clicking Refresh updates the repository list with new repos', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })

    await setWiremockScenarioState('refreshRepos', 'beforeRefresh')

    await navigateToGithubRepoList(page)

    await expect(page.locator('.github-list li').filter({ hasText: 'dtdl-test-fixtures' })).toBeVisible()
    await expect(page.locator('.github-list li').filter({ hasText: 'newly-authorized-repo' })).not.toBeVisible()

    await setWiremockScenarioState('refreshRepos', 'afterRefresh')

    const refreshButton = page.locator('#refresh-repos-button')
    await waitForSuccessResponse(page, () => refreshButton.click(), '/repos')

    await expect(page.locator('.github-list li').filter({ hasText: 'dtdl-test-fixtures' })).toBeVisible()
    await expect(page.locator('.github-list li').filter({ hasText: 'newly-authorized-repo' })).toBeVisible()
  })

  test('Refresh does not reset selected organization context', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./open')
    await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

    await waitForSuccessResponse(
      page,
      () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
      '/menu'
    )
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')

    await expect(page.locator('.github-list li').first()).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('.github-list li').first().click(), '/repos')

    await expect(page.locator('.github-list li').filter({ hasText: '<' })).toBeVisible()
    await expect(page.locator('#github-path-label')).toContainText('Repositories:')

    const refreshButton = page.locator('#refresh-repos-button')
    await expect(refreshButton).toBeEnabled()
    await waitForSuccessResponse(page, () => refreshButton.click(), '/repos')

    await expect(page.locator('.github-list li').filter({ hasText: '<' })).toBeVisible()
    await expect(page.locator('#github-path-label')).toContainText('Repositories:')
  })

  test('User can authorize repo externally, refresh, and see newly authorized repo', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })

    await setWiremockScenarioState('refreshRepos', 'beforeRefresh')

    await navigateToGithubRepoList(page)

    const authorizeLink = page.locator('a').filter({ hasText: 'Authorise on GitHub' })
    await expect(authorizeLink).toBeVisible()
    await expect(authorizeLink).toHaveAttribute('target', '_blank')

    await expect(page.locator('.github-list li').filter({ hasText: 'newly-authorized-repo' })).not.toBeVisible()

    await setWiremockScenarioState('refreshRepos', 'afterRefresh')

    const refreshButton = page.locator('#refresh-repos-button')
    await waitForSuccessResponse(page, () => refreshButton.click(), '/repos')

    await expect(page.locator('.github-list li').filter({ hasText: 'newly-authorized-repo' })).toBeVisible()
  })
})
