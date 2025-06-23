import { expect, test } from '@playwright/test'
import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('Share Ontology Link', () => {
  const projectName = test.info().project.name
  test('ontology can be viewed correctly on another browser', async ({ browser }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    const context = await browser.newContext()
    if (projectName.includes('chromium')) {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    }
    const page1 = await context.newPage()
    await page1.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page1, () => page1.goto('./'))
    await expect(page1.locator('#toolbar').getByText('Share Ontology')).toBeVisible()

    page1.locator('#toolbar').getByText('Share Ontology').click()
    await expect(page1.locator('#toolbar').getByText('Shareable Link')).toBeVisible()
    // click on first radio
    page1.locator('#share-link-modal').getByText('Entire ontology').click()
    // assert the link is as expected
    await expect
      .poll(async () => {
        return await page1.locator('#link-output').inputValue()
      })
      .toBe(page1.url().split('?')[0])
    // click copy
    page1.locator('#copy-link-button').click()
    await expect(page1.locator('#share-link-modal').getByText('Copied!')).toBeVisible()
    const clipboardText = await page1.evaluate(() => navigator.clipboard.readText())
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
    page2.locator('#toolbar').getByText('Share Ontology').click()
    await expect(page2.locator('#toolbar').getByText('Shareable Link')).toBeVisible()
    // click second radio button
    page2.locator('#share-link-modal').getByText('Current search').click()
    await expect
      .poll(async () => {
        return await page2.locator('#link-output').inputValue()
      })
      .toBe(page2.url())
    // click copy
    page2.locator('#copy-link-button').click()
    await expect(page2.locator('#share-link-modal').getByText('Copied!')).toBeVisible()
    const clipboardTextSearch = await page2.evaluate(() => navigator.clipboard.readText())
    // assert that the link is correct
    const page3 = await context.newPage()
    await page3.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page3, () => page3.goto(clipboardTextSearch))
    // open a new page and test that the ontology is also filtered
    await expect(page3.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()
    await expect(page3.locator('#mermaid-output').getByText('IdentifiedObject')).not.toBeVisible()
  })
})
