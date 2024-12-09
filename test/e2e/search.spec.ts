import { expect, test } from '@playwright/test'

test.describe('search', () => {
  test('change search to reveal nodes', async ({ page }) => {
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.goto('./?layout=elk&diagramType=flowchart&search=Node'),
    ])

    await page.focus('#search')

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.fill('#search', 'Container'),
    ])

    await page.waitForTimeout(500)

    expect(await page.isVisible("text='Equipment'")).toBe(true)
  })
})
