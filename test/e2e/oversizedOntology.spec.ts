import { expect, test } from '@playwright/test'
import { visualisationUIOversizePort } from '../globalSetup'
import { directlyClickElement } from './helpers/clickHelpers'
import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('Testing against large ontologies', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIOversizePort}` })

  test('Return Text instead of render', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`./`)
    // Load default ontology which is larger than the max size
    await expect(
      page
        .locator('#mermaid-output')
        .getByText(
          'For optimal performance, the full ontology file is too large to load at once. Please load a subset of nodes or relationships via the search bar',
          { exact: true }
        )
    ).toBeVisible()
    // Filter for a smaller ontology from search
    await page.focus('#search')
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.fill('#search', 'voltageLevel'),
    ])

    await expect(
      page.locator('#mermaid-output').locator('[id*=VoltageLevel]').getByText('VoltageLevel', { exact: true })
    ).toBeVisible()
    // expand
    const expand = page.locator('#mermaid-output').locator('[id*=Substation]').getByText('+', { exact: true })
    await waitForUpdateLayout(page, () => directlyClickElement(expand))

    // Dtdl becomes oversized again
    await expect(
      page
        .locator('#mermaid-output')
        .getByText(
          'For optimal performance, the full ontology file is too large to load at once. Please load a subset of nodes or relationships via the search bar',
          { exact: true }
        )
    ).toBeVisible()
  })
})
