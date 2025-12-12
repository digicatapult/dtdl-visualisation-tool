/**
 * E2E Tests for Server-Side PostHog Events
 *
 * These tests verify that server-side PostHog events are properly sent
 * by triggering actions and checking the mock server's captured events.
 *
 * NOTE: These tests run in chromium only and verify server-side tracking
 * via the mock PostHog server.
 */

import { expect, test } from '@playwright/test'
import { POSTHOG_MOCK_PORT } from '../mocks/posthogMock'

const POSTHOG_MOCK_URL = `http://localhost:${POSTHOG_MOCK_PORT}`

test.describe('PostHog Server-Side Events', () => {
  test('should have captured events from container startup and other tests', async () => {
    // Query mock server for all events captured during the test run
    // This runs alongside other tests and checks that events have been captured
    const response = await fetch(`${POSTHOG_MOCK_URL}/test/events`)
    const events = await response.json()

    // Should have captured events from container startup and other tests
    expect(events.length).toBeGreaterThan(0)

    // Find uploadOntology events
    const uploadEvents = events.filter((e: { event: string }) => e.event === 'uploadOntology')
    expect(uploadEvents.length).toBeGreaterThan(0)
  })

  test('should capture updateOntologyView event with searchTerm', async ({ page }) => {
    // Record initial event count
    const initialResponse = await fetch(`${POSTHOG_MOCK_URL}/test/events`)
    const initialEvents = await initialResponse.json()
    const initialCount = initialEvents.length

    // Navigate to the sample ontology
    await page.goto('http://localhost:3000/')

    // Wait for the diagram to render
    await page.waitForSelector('#mermaid-output', { timeout: 10000 })

    // Find and use the search input
    const searchInput = page.locator('input[name="searchTerm"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('Terminal')
      await searchInput.press('Enter')

      // Wait for search to process and event to flush
      await page
        .waitForResponse((response) => response.url().includes('/test/events') || response.url().includes('/batch'), {
          timeout: 5000,
        })
        .catch(() => {}) // Event may have already been sent

      // Query mock server for new events
      const response = await fetch(`${POSTHOG_MOCK_URL}/test/events`)
      const events = await response.json()

      // Should have captured more events
      expect(events.length).toBeGreaterThan(initialCount)

      // Find event with searchTerm
      const searchEvent = events.find(
        (e: { event: string; properties?: { searchTerm?: string } }) =>
          e.event === 'updateOntologyView' && e.properties?.searchTerm === 'Terminal'
      )

      expect(searchEvent).toBeDefined()
      if (searchEvent) {
        expect(searchEvent.properties.searchTerm).toBe('Terminal')
      }
    }
  })

  test('should have captured identify events', async () => {
    // Query mock server
    const response = await fetch(`${POSTHOG_MOCK_URL}/test/events`)
    const events = await response.json()

    // Should have $identify events from user authentication
    const identifyEvents = events.filter((e: { event: string }) => e.event === '$identify')
    expect(identifyEvents.length).toBeGreaterThan(0)
  })
})
