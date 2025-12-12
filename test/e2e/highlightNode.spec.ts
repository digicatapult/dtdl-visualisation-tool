import { expect, test } from '@playwright/test'
import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('highlight', () => {
  test('flowchart - interface should change to highlight colour and navigation panel open', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='Terminal'`)

    await waitForUpdateLayout(page, () =>
      page.locator('#mermaid-output').getByText('ACDCTerminal', { exact: true }).click()
    )
    await page.locator('#navigation-panel').getByText('Details', { exact: true }).click()

    await expect(page.locator('#navigation-panel-details').getByText('ACDCTerminal', { exact: true })).toBeVisible()

    const rect = page.locator('#mermaid-output').locator('[id*=ACDCTerminal]').locator('rect.label-container')

    await expect(rect).toHaveCSS('fill', 'rgb(251, 242, 145)')
  })

  test('flowchart - relationship should change to highlight colour and navigation panel open', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='Terminal'`)

    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-out').click()
    }

    await waitForUpdateLayout(page, () =>
      page.locator('#mermaid-output').getByText('CurveDatas', { exact: true }).click()
    )
    await page.locator('#navigation-panel').getByText('Details', { exact: true }).click()

    // Verify relationship Name field is visible
    await expect(page.locator('#navigation-panel-details').getByText('Name: CurveDatas')).toBeVisible()
    await expect(page.locator('#navigation-panel-details').getByText('CurveDatas', { exact: true })).toBeVisible()

    const text = page.locator('#mermaid-output').getByText('CurveDatas', { exact: true })

    await expect(text).toHaveCSS('fill', 'rgb(255, 0, 0)')
  })

  test('class diagram - interface should change to highlight colour and navigation panel open', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./?diagramType=classDiagram')
    await page.waitForSelector(`text='Terminal'`)

    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-out').click()
    }

    await waitForUpdateLayout(page, () =>
      page.locator('#mermaid-output').getByText('Terminal', { exact: true }).click()
    )
    await page.locator('#navigation-panel').getByText('Details', { exact: true }).click()

    await expect(page.locator('#navigation-panel-details').getByText('Terminal', { exact: true })).toBeVisible()

    const path = page
      .locator('#mermaid-output')
      .locator('[id*=ACDCTerminal]')
      .locator('g.label-container')
      .locator('path')
      .first()

    await expect(path).toHaveAttribute('fill', '#ECECFF')
  })

  test('class diagram - relationship should change to highlight colour and navigation panel open', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('./?diagramType=classDiagram')
    await page.waitForSelector(`text='Terminal'`)

    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-out').click()
    }
    await waitForUpdateLayout(page, () =>
      page.locator('#mermaid-output').getByText('memberOfSubstation', { exact: true }).click()
    )
    await page.locator('#navigation-panel').getByText('Details', { exact: true }).click()

    await expect(
      page.locator('#navigation-panel-details').getByText('memberOfSubstation', { exact: true })
    ).toBeVisible()

    const text = page.locator('#mermaid-output').getByText('memberOfSubstation', { exact: true })

    await expect(text).toHaveCSS('fill', 'rgb(255, 0, 0)')
  })
})
