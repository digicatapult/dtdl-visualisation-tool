import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ghTestUser = process.env.GH_TEST_USER
const ghTestPassword = process.env.GH_TEST_PASSWORD

if (!ghTestUser || !ghTestPassword) throw new Error('Test GitHub user credentials required')

test.describe('Upload ontology from GitHub via OAuth', () => {
  test.skip('Success path for uploading ontology from Github', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))
    await expect(page.locator('#toolbar').getByText('Open Ontology')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByText('Upload New File')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')
    await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), 'github.com/login')
    await expect(page.locator('#login')).toBeVisible()

    // Sign in with Test GitHub user
    await page.fill('#login_field', ghTestUser)
    await page.fill('#password', ghTestPassword)

    await waitForSuccessResponse(page, () => page.click('input[name="commit"]'), 'github.com/login/oauth')

    await page.waitForTimeout(5000)
    // Click auth if page isn't redirected to callback
    if (!page.url().includes('/open')) {
      await waitForSuccessResponse(page, () => page.locator('button:has-text("authorize")').click(), '/repos')
    }

    // click first of test users repos
    await expect(page.locator('.github-list li').first()).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('.github-list li').first().click(), '/branches')

    // click main branch, 1st option is back button
    await expect(page.locator('.github-list li').nth(1)).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('.github-list li').nth(1).click(), '/contents')

    // get dtdl from github
    await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
    await expect(page.locator('#mermaid-output').getByText('dtmi:com:example;1')).toBeVisible()
  })
})
