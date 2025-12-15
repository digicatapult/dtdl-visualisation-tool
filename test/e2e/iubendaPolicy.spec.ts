import { expect, test } from '@playwright/test'

import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('Iubenda Policy Widget', () => {
  test('should display privacy policy and cookie policy links on main page', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))

    // Check that the Iubenda widget container exists
    const widgetContainer = page.locator('#iubenda-policy-widget')
    await expect(widgetContainer).toBeVisible()

    // Wait for the Iubenda script to load and render the links
    // The script should inject anchor tags with the iubenda class
    await page.waitForSelector('a.iubenda-black', { timeout: 10000 })

    // Check for Privacy Policy link
    const privacyPolicyLink = page.locator('a.iubenda-black[title*="Privacy Policy"]')
    await expect(privacyPolicyLink).toBeVisible()
    await expect(privacyPolicyLink).toHaveAttribute('href', /iubenda\.com\/privacy-policy/)

    // Check for Cookie Policy link
    const cookiePolicyLink = page.locator('a.iubenda-black[title*="Cookie Policy"]')
    await expect(cookiePolicyLink).toBeVisible()
    await expect(cookiePolicyLink).toHaveAttribute('href', /iubenda\.com\/privacy-policy.*cookie-policy/)

    // Verify positioning - should be in bottom right
    const bbox = await widgetContainer.boundingBox()
    expect(bbox).toBeTruthy()
    if (bbox) {
      expect(bbox.x).toBeGreaterThan(1700) // Right side of screen (viewport width is 1920)
      expect(bbox.y).toBeGreaterThan(900) // Bottom of screen (viewport height is 1080)
    }
  })

  test('should display policy widget on the upload/open page', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./open')

    // Check that the Iubenda widget container exists on open page
    const widgetContainer = page.locator('#iubenda-policy-widget')
    await expect(widgetContainer).toBeVisible()

    // Wait for the Iubenda script to load and render the links
    await page.waitForSelector('a.iubenda-black', { timeout: 10000 })

    // Verify both links are present
    const privacyPolicyLink = page.locator('a.iubenda-black[title*="Privacy Policy"]')
    await expect(privacyPolicyLink).toBeVisible()

    const cookiePolicyLink = page.locator('a.iubenda-black[title*="Cookie Policy"]')
    await expect(cookiePolicyLink).toBeVisible()
  })

  test('should not overlap with legend when legend is expanded', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))

    // Wait for policy widget
    await page.waitForSelector('a.iubenda-black', { timeout: 10000 })

    // Get the legend button and expand it
    const legendButton = page.locator('#legend button')
    await expect(legendButton).toBeVisible()
    await legendButton.click()

    // Wait for legend to expand
    await page.waitForSelector('#legend-content.show-content')

    // Get bounding boxes
    const widgetBbox = await page.locator('#iubenda-policy-widget').boundingBox()
    const legendBbox = await page.locator('#legend-content').boundingBox()

    expect(widgetBbox).toBeTruthy()
    expect(legendBbox).toBeTruthy()

    if (widgetBbox && legendBbox) {
      // Widget is on bottom right, legend is on bottom left - they should not overlap horizontally
      // Check that widget is to the right of the legend
      expect(widgetBbox.x).toBeGreaterThan(legendBbox.x + legendBbox.width)
    }
  })

  test('policy links should be clickable and open in new window', async ({ page, context }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))

    // Wait for the Iubenda script to load
    await page.waitForSelector('a.iubenda-black', { timeout: 10000 })

    const privacyPolicyLink = page.locator('a.iubenda-black[title*="Privacy Policy"]').first()

    // Set up a listener for new pages (Iubenda links typically open in new window/tab)
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      privacyPolicyLink.click(),
    ])

    // Verify the new page URL is from Iubenda
    expect(newPage.url()).toContain('iubenda.com')
    await newPage.close()
  })

  test('should not interfere with toast notifications', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))

    // Wait for policy widget
    await page.waitForSelector('a.iubenda-black', { timeout: 10000 })

    // Get the z-index of the policy widget
    const widgetZIndex = await page.locator('#iubenda-policy-widget').evaluate((el) => {
      return window.getComputedStyle(el).zIndex
    })

    // Get the z-index of toast container
    const toastZIndex = await page.locator('#toast-container').evaluate((el) => {
      return window.getComputedStyle(el).zIndex
    })

    // Toast should have higher z-index than policy widget
    expect(parseInt(toastZIndex)).toBeGreaterThan(parseInt(widgetZIndex))
  })
})
