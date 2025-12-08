import { test, expect } from '@playwright/test'

/**
 * PostHog Client-Side E2E Tests
 * 
 * These tests verify that the PostHog client-side library is properly initialized
 * and that autocapture and pageview events are being sent.
 * 
 * NOTE: Server-side events (uploadOntology, updateOntologyView, nodeSelected, etc.)
 * are sent from the server directly to PostHog and cannot be intercepted via 
 * browser network requests. Those are covered by unit tests.
 */

test.describe('PostHog Client-Side Integration', () => {
    test.use({
        viewport: { width: 1440, height: 1080 },
    })

    test('should load PostHog script on page load', async ({ page }) => {
        // Navigate to the app
        await page.goto('/')

        // Wait for PostHog to initialize
        await page.waitForTimeout(2000)

        // Check that PostHog is defined on window
        const posthogDefined = await page.evaluate(() => {
            return typeof (window as any).posthog !== 'undefined'
        })

        expect(posthogDefined).toBe(true)
    })

    test('should have PostHog capture function available', async ({ page }) => {
        await page.goto('/')
        await page.waitForTimeout(2000)

        // Check that posthog.capture is a function
        const captureIsFunction = await page.evaluate(() => {
            return typeof (window as any).posthog?.capture === 'function'
        })

        expect(captureIsFunction).toBe(true)
    })

    test('should have distinct_id set after initialization', async ({ page }) => {
        await page.goto('/')
        await page.waitForTimeout(2000)

        // Check that a distinct ID is set
        const distinctId = await page.evaluate(() => {
            return (window as any).posthog?.get_distinct_id?.()
        })

        expect(distinctId).toBeTruthy()
        expect(typeof distinctId).toBe('string')
    })

    test('should send network requests to PostHog host', async ({ page }) => {
        // Track PostHog API requests
        const posthogRequests: string[] = []

        page.on('request', (request) => {
            const url = request.url()
            if (url.includes('posthog.com') || url.includes('/e/') || url.includes('/decide')) {
                posthogRequests.push(url)
            }
        })

        await page.goto('/')
        await page.waitForTimeout(3000)

        // Should have made at least one request to PostHog (decide or batch)
        expect(posthogRequests.length).toBeGreaterThan(0)
    })

    test('should have autocapture enabled', async ({ page }) => {
        await page.goto('/')
        await page.waitForTimeout(2000)

        // Check autocapture config
        const autocaptureEnabled = await page.evaluate(() => {
            const config = (window as any).posthog?.config
            // autocapture is enabled by default, only disabled if explicitly set to false
            return config?.autocapture !== false
        })

        expect(autocaptureEnabled).toBe(true)
    })
})
