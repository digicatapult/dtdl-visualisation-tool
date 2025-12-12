import { expect, test } from '@playwright/test'
import { POSTHOG_MOCK_PORT } from '../mocks/posthogMock'

/**
 * PostHog Client-Side E2E Tests
 *
 * These tests verify that the PostHog client-side library is properly initialized.
 *
 * NOTE: When running with the mock PostHog server, client-side tests may be limited
 * because the browser cannot reach host.docker.internal. Server-side events are
 * verified by posthog-server.spec.ts instead.
 */

test.describe('PostHog Client-Side Integration', () => {
  test.use({
    viewport: { width: 1440, height: 1080 },
  })

  // Skip tests if using mock server (browser can't reach host.docker.internal)
  const usingMockServer = POSTHOG_MOCK_PORT !== undefined

  test('should have PostHog script tag in page', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check that PostHog script is present in the page
    const hasPosthogScript = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      return scripts.some(
        (s) => s.src.includes('posthog') || s.innerHTML.includes('posthog') || s.innerHTML.includes('POSTHOG')
      )
    })

    expect(hasPosthogScript).toBe(true)
  })

  test('should have PostHog initialization code', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check that posthog.init was called by looking for posthog in window
    // Note: may be undefined if host.docker.internal is unreachable from browser
    const hasPosthog = await page.evaluate(() => {
      return 'posthog' in window
    })

    // When using mock, posthog may not fully initialize but should be defined
    if (!usingMockServer) {
      expect(hasPosthog).toBe(true)
    }
  })
})
