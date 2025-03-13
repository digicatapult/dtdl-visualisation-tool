import { expect, test } from '@playwright/test'

test.describe('search', () => {
  test('change search to reveal nodes', async ({ page }) => {
    await page.goto('./?diagramType=flowchart&search=Node')
    await page.waitForSelector("text='ConnectivityNodeContainer'")

    await page.focus('#search')
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.fill('#search', 'Container'),
    ])

    await expect(page.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()
  })
})
