import { expect, test } from '@playwright/test'
import { visualisationUIWiremockPort } from '../globalSetup.js'
import { openGithubOntology } from './helpers/githubHelpers.js'
import { getShareableLink } from './helpers/shareLinkHelper.js'
import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('Share Ontology Link', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIWiremockPort}` })

  test('ontology can be viewed correctly on another browser', async ({ browser }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    const context = await browser.newContext()
    const projectName = test.info().project.name
    const page1 = await context.newPage()
    await page1.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page1, () => page1.goto('./'))
    const clipboardText = await getShareableLink(page1, context, projectName)
    // open a new page and test
    const page2 = await context.newPage()
    await page2.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page2, () => page2.goto(clipboardText))

    await expect(page2.locator('#mermaid-output').getByText('IdentifiedObject')).toBeVisible()
    // in the new page search for a smaller ontology
    await page2.focus('#search')
    await Promise.all([
      page2.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page2.fill('#search', 'Container'),
    ])
    await expect(page2.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()
    await expect(page2.locator('#mermaid-output').getByText('IdentifiedObject')).not.toBeVisible()
    // open the shared link
    const clipboardTextSearch = await getShareableLink(page2, context, projectName, false)
    // assert that the link is correct
    const page3 = await context.newPage()
    await page3.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page3, () => page3.goto(clipboardTextSearch))
    // open a new page and test that the ontology is also filtered
    await expect(page3.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()
    await expect(page3.locator('#mermaid-output').getByText('IdentifiedObject')).not.toBeVisible()
    await context.close()
  })
  test('private ontology can be viewed correctly on another browser/github user edits enabled', async ({ browser }) => {
    // Open ontology and copy share link
    const repoName = 'nidt_ontology_private_with_collaborator'
    const context1 = await browser.newContext()
    const projectName = test.info().project.name
    if (projectName.includes('chromium')) {
      await context1.grantPermissions(['clipboard-read', 'clipboard-write'])
    }
    const page1 = await context1.newPage()
    await page1.setViewportSize({ width: 1920, height: 1080 })

    await openGithubOntology(page1, repoName, /^main$/)

    const clipboardText = await getShareableLink(page1, context1, projectName)
    await context1.close()
    // Open another browser without user any user logged in
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await page2.setViewportSize({ width: 1920, height: 1080 })
    await page2.goto(clipboardText)
    // Assert ontology view
    expect(await page2.locator('#edit-toggle .switch').isEnabled()).toBeTruthy()
    await waitForSuccessResponse(page2, () => page2.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page2.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    await context2.close()
  })
  test('private ontology cannot be viewed on another browser/github user', async ({ browser }) => {
    const repoName = 'nidt_ontology_private_without_collaborator'
    // Open ontology and copy share link
    const context1 = await browser.newContext()
    const projectName = test.info().project.name
    if (projectName.includes('chromium')) {
      await context1.grantPermissions(['clipboard-read', 'clipboard-write'])
    }
    const page1 = await context1.newPage()
    await page1.setViewportSize({ width: 1920, height: 1080 })

    await openGithubOntology(page1, repoName, /^main$/)

    const clipboardText = await getShareableLink(page1, context1, projectName)
    await context1.close()

    // Open another browser without user any user logged in
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await page2.setViewportSize({ width: 1920, height: 1080 })
    await page2.goto(clipboardText)
    // Assert 401
    await expect(page2.locator('#mermaid-output-message').getByText('You are unauthorised')).toBeVisible()
    await context2.close()
  })
})
