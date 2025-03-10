import { expect, test } from '@playwright/test'
import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('diagram type', () => {
  test('change to classDiagram type', async ({ page }) => {
    await page.goto('./?diagramType=flowchart')
    await expect(page.locator('#mermaid-output #mermaid-svg')).toHaveClass('flowchart')

    await waitForUpdateLayout(page, () => page.getByLabel('Diagram Type').selectOption('classDiagram'))
    await expect(page.locator('#mermaid-output #mermaid-svg')).toHaveClass('classDiagram')
  })
})
