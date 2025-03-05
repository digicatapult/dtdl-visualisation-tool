import { expect, test } from '@playwright/test'
import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('highlight', () => {
  test.only('flowchart - interface should change to highlight colour and navigation panel open', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')

    await waitForUpdateLayout(page, () =>
      page.locator('#mermaid-output').getByText('ACDCTerminal', { exact: true }).click()
    )

    await expect(
      page.locator('#navigation-panel-content').getByText('Display Name: ACDCTerminal', { exact: true })
    ).toBeVisible()

    const rect = page.locator('#mermaid-output').locator('[id*=ACDCTerminal]').locator('rect.label-container')

    await expect(rect).toHaveCSS('fill', 'rgb(251, 242, 145)')
  })
})
