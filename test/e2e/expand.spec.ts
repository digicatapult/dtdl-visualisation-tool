import { expect, Locator, test } from '@playwright/test'
import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('expand', () => {
  test('flowchart - expand/unexpand nodes', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./?search=IdentifiedObject')
    await page.waitForSelector(`text='ACDCTerminal'`)

    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-out').click()
    }

    // expand
    const expand = page.locator('#mermaid-output').locator('[id*=ACDCTerminal]').getByText('+', { exact: true })
    await waitForUpdateLayout(page, () => directlyClickElement(expand))

    // child is revealed
    await expect(page.locator('#mermaid-output').getByText('Terminal', { exact: true })).toBeVisible()

    // expanded node is highlighted
    const rect = page.locator('#mermaid-output').locator('[id*=ACDCTerminal]').locator('rect.label-container')
    await expect(rect).toHaveCSS('fill', 'rgb(251, 242, 145)')

    // unexpand icon shown
    const unexpand = page.locator('#mermaid-output').locator('[id*=ACDCTerminal]').getByText('-', { exact: true })
    await expect(unexpand).toBeVisible()

    // unexpand
    await waitForUpdateLayout(page, () => directlyClickElement(unexpand))

    // child is hidden
    await expect(page.locator('#mermaid-output').getByText('Terminal', { exact: true })).not.toBeVisible()

    // expand icon shown
    await expect(expand).toBeVisible()
  })

  test('class diagram - expand/unexpand nodes', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./?search=IdentifiedObject&diagramType=classDiagram')
    await page.waitForSelector(`text='ACDCTerminal'`)

    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-out').click()
    }

    // expand
    const expand = page.locator('#mermaid-output').locator('[id*=ACDCTerminal]').getByText('+', { exact: true })
    await waitForUpdateLayout(page, () => directlyClickElement(expand))

    // child is revealed
    await expect(page.locator('#mermaid-output').getByText('Terminal', { exact: true })).toBeVisible()

    // expanded node is highlighted
    const path = page
      .locator('#mermaid-output')
      .locator('[id*=ACDCTerminal]')
      .locator('g.label-container')
      .locator('path')
      .first()
    await expect(path).toHaveAttribute('fill', '#ECECFF')

    // unexpand icon shown
    const unexpand = page.locator('#mermaid-output').locator('[id*=ACDCTerminal]').getByText('-', { exact: true })
    await expect(unexpand).toBeVisible()

    // unexpand
    await waitForUpdateLayout(page, () => directlyClickElement(unexpand))

    // child is hidden
    await expect(page.locator('#mermaid-output').getByText('Terminal', { exact: true })).not.toBeVisible()

    // expand icon shown
    await expect(expand).toBeVisible()
  })
})

// work around <rect> intercepting pointer events in Safari
const directlyClickElement = async (locator: Locator) => {
  await locator.evaluate((el) => {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    })
    el.dispatchEvent(event)
  })
}
