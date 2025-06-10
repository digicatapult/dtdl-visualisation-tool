import { expect, test } from '@playwright/test'

test.describe('Testing against large ontologies', () => {
  const limitedOntologySizeHost = 'http://localhost:3001'
  test('Return Text instead of render', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`${limitedOntologySizeHost}`)
    await expect(page.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()
  })
})
