import { expect, Page, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('multiple sessions', () => {
  test('render two simultaneous sessions correctly', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()
    const pages = context.pages()

    // load both pages
    await Promise.all(
      pages.map(async (page) => {
        await waitForUpdateLayout(page, () => page.goto('./'))
      })
    )

    // Upload ontology to second page
    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/simple.zip')

    await waitForUpdateLayout(pageTwo, () =>
      pageTwo.locator('#toolbar').getByLabel('Upload Ontology').setInputFiles(filePath)
    )

    // change to class diagram type on both pages
    await Promise.all(
      pages.map(async (page) => {
        await waitForUpdateLayout(page, () => page.getByLabel('Diagram Type').selectOption('classDiagram'))
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

const waitForUpdateLayout = async <T>(page: Page, action: () => Promise<T>) => {
  const updateLayoutResponse = page.waitForResponse(
    (resp) => resp.url().includes('/update-layout') && resp.status() === 200
  )
  await action()
  await updateLayoutResponse
}
