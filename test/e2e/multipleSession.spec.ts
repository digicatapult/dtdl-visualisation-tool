import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForUpdateLayout, waitForUploadFileFromRoot } from './helpers/waitForHelpers.js'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('multiple sessions', () => {
  test('render two simultaneous sessions correctly', async ({ browser }) => {
    test.setTimeout(60000)

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()
    const pages = context.pages()

    // load both pages
    await Promise.allSettled(
      pages.map(async (page) => {
        await waitForUpdateLayout(page, () => page.goto('./'))
      })
    )

    // Upload ontology to second page
    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/simple.zip')
    await waitForUploadFileFromRoot(
      pageTwo,
      () => pageTwo.locator('#main-view').getByText('Local Zip File').click(),
      filePath
    )

    // change to class diagram type on both pages
    await Promise.all(
      pages.map(async (page) => {
        await waitForUpdateLayout(page, () => page.locator('#diagram-type-select').selectOption('classDiagram'))
      })
    )

    // check both pages are still showing their correct model
    await expect(pageOne.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()
    await expect(pageTwo.locator('#mermaid-output').getByText('dtmi:com:example;1')).toBeVisible()

    // search for a node on both pages
    await pageOne.focus('#search')
    await waitForUpdateLayout(pageOne, () => pageOne.fill('#search', 'Container'))

    await pageTwo.focus('#search')
    await waitForUpdateLayout(pageTwo, () => pageTwo.fill('#search', 'example'))

    // check both pages are still showing their correct model
    await expect(pageOne.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()
    await expect(pageTwo.locator('#mermaid-output').getByText('dtmi:com:example;1')).toBeVisible()
  })
})
