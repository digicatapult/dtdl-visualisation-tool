import { expect, test } from '@playwright/test'

test.describe.skip('search', () => {
  test('change search to reveal nodes', async ({ page }) => {
    await page.goto('./?layout=elk&diagramType=flowchart&search=Node')
    await page.waitForSelector("text='ConnectivityNodeContainer'")

    await page.focus('#search')
    page.fill('#search', 'Container')

    await page.waitForSelector("text='Equipment'")

    expect(await page.isVisible("text='Equipment'")).toBe(true)
  })
})
