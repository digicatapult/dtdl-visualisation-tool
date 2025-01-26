import { expect, test } from '@playwright/test'

test.describe('search', () => {
  test('change search to reveal nodes', async ({ page }) => {
    await page.goto('./')
    await page.waitForTimeout(1000)
    await page.goto('./?layout=elk&diagramType=flowchart&search=Node')
    await page.waitForSelector("text='ConnectivityNodeContainer'")

    await page.focus('#search')
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.fill('#search', 'Container'),
    ])
    await page.waitForTimeout(5000)

    expect(await page.isVisible("text='EquipmentContainer'")).toBe(true)
  })
})
