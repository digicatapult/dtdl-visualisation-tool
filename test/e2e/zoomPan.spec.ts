import { expect, test } from '@playwright/test'

test.describe('zoom + pan', () => {
  test('zoom out button', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='ACDCTerminal'`)

    const geographicalRegion = page.locator('#mermaid-output').getByText('GeographicalRegion', { exact: true })
    await expect(geographicalRegion).not.toBeInViewport()

    // zoom out until visible
    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-out').click()
    }

    await expect(geographicalRegion).toBeInViewport()
  })

  test('zoom in button', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='ACDCTerminal'`)

    const identifiedObject = page.locator('#mermaid-output').getByText('IdentifiedObject', { exact: true })
    await expect(identifiedObject).toBeInViewport()

    // zoom in until not visible
    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-in').click()
    }
    await expect(identifiedObject).not.toBeInViewport()
  })

  test('reset button', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='ACDCTerminal'`)

    const curveStyle = page.locator('#mermaid-output').getByText('CurveStyle', { exact: true })
    await expect(curveStyle).toBeInViewport()

    // zoom in until not visible
    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-in').click()
    }
    await expect(curveStyle).not.toBeInViewport()

    //reset so visible
    await page.locator('#reset-pan-zoom').click()

    await expect(curveStyle).toBeInViewport()
  })

  test('double click zoom in', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='ACDCTerminal'`)

    const identifiedObject = page.locator('#mermaid-output').getByText('IdentifiedObject', { exact: true })
    await expect(identifiedObject).toBeInViewport()

    // zoom in until visible
    for (let i = 0; i < 10; i++) {
      await page.locator('#mermaid-output').dblclick()
    }
    await expect(identifiedObject).not.toBeInViewport()
  })

  test('pan with click and drag', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='ACDCTerminal'`)

    const identifiedObject = page.locator('#mermaid-output').getByText('IdentifiedObject', { exact: true })
    await expect(identifiedObject).toBeInViewport()

    await page.locator('#mermaid-output').hover()
    await page.mouse.down()
    await page.mouse.move(300, 200) // pan until not visible
    await page.mouse.up()

    await expect(identifiedObject).not.toBeInViewport()
  })
})
