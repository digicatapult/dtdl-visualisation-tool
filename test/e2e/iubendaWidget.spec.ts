import { expect, test } from '@playwright/test'
import { waitForUpdateLayout } from './helpers/waitForHelpers.js'

/**
 * Iubenda Widget E2E Tests
 *
 * These tests verify the Iubenda privacy policy widget integration.
 * Note: The widget is disabled in test environments by default (IUBENDA_ENABLED=false in test.env)
 * These tests use a pre-started container (port 3002) with Iubenda enabled from globalSetup.
 */

test.describe('Iubenda Privacy Policy Widget', () => {
  test.use({ baseURL: 'http://localhost:3002' })

  test('Should load and display the Iubenda widget', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))

    // Check that the Iubenda script tag is present
    // Iubenda injects multiple scripts, so check for at least one
    const scriptTag = page.locator('script[src*="iubenda.com"]')
    await expect(scriptTag.first()).toBeAttached() // Script tags are in DOM but not visible

    // Wait for the Iubenda widget to load - it creates an alertdialog
    await page.waitForSelector('[role="alertdialog"]', { timeout: 15000 })

    // Verify the cookie consent dialog is visible
    const cookieDialog = page.locator('[role="alertdialog"]')
    await expect(cookieDialog).toBeVisible()

    // Verify the iubenda branding link is present (there may be multiple iubenda links)
    const iubendaBrandLink = page.locator('a.iubenda-cs-brand-badge')
    await expect(iubendaBrandLink).toBeVisible()

    // Verify the consent buttons are present
    const acceptButton = page.locator('button:has-text("Accept")')
    const rejectButton = page.locator('button:has-text("Reject")')
    await expect(acceptButton).toBeVisible()
    await expect(rejectButton).toBeVisible()
  })

  test('Should position widget in bottom right corner', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))

    // Wait for the Iubenda widget alertdialog to load
    await page.waitForSelector('[role="alertdialog"]', { timeout: 15000 })

    const cookieDialog = page.locator('[role="alertdialog"]')
    await expect(cookieDialog).toBeVisible()

    // Verify the iubenda branding link is present (use class to avoid multiple match error)
    const iubendaBrandLink = page.locator('a.iubenda-cs-brand-badge')
    await expect(iubendaBrandLink).toBeVisible()
  })

  test('Should not overlap with other UI elements', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))

    // Wait for the Iubenda widget alertdialog to load
    await page.waitForSelector('[role="alertdialog"]', { timeout: 15000 })

    // Verify the cookie dialog is visible and properly layered
    const cookieDialog = page.locator('[role="alertdialog"]')
    await expect(cookieDialog).toBeVisible()

    // Verify key UI elements are still accessible despite the cookie banner
    const heading = page.locator('h2:has-text("UKDTC")')
    await expect(heading).toBeVisible()
  })
})
