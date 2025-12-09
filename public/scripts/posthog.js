/**
 * PostHog client-side integration utilities
 * Handles user identification when GitHub authentication occurs
 */

// PostHog initialization delay in milliseconds
const POSTHOG_INIT_DELAY_MS = 1000

/**
 * Check if PostHog is loaded and ready
 */
function isPostHogReady() {
  return typeof window.posthog !== 'undefined' && window.posthog.__loaded
}

/**
 * Identify authenticated GitHub user in PostHog
 * This should be called after successful GitHub authentication
 */
function identifyGitHubUser() {
  if (!isPostHogReady()) {
    console.debug('PostHog not ready for GitHub user identification')
    return
  }

  // The server will handle the actual identification via identifyFromRequest
  // This is just for additional client-side tracking
  try {
    // Track that GitHub authentication occurred
    window.posthog.capture('github_authenticated', {
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('PostHog GitHub identification error:', error)
  }
}

/**
 * Track custom events for HTMX interactions
 * These may not be auto-captured by PostHog
 */
function setupPostHogEventTracking() {
  if (!isPostHogReady()) {
    return
  }

  // Track HTMX requests
  document.body.addEventListener('htmx:afterRequest', function (event) {
    const target = event.detail.target
    const triggeringElement = event.detail.elt

    // Get action context
    const action = triggeringElement?.getAttribute('hx-get') || 
                   triggeringElement?.getAttribute('hx-post') || 
                   triggeringElement?.getAttribute('hx-put') ||
                   'unknown'

    try {
      window.posthog.capture('htmx_interaction', {
        action: action,
        target_id: target?.id || 'unknown',
        status: event.detail.xhr?.status || 'unknown',
      })
    } catch (error) {
      console.error('PostHog HTMX tracking error:', error)
    }
  })

  // Track ontology view changes
  document.body.addEventListener('htmx:afterSwap', function (event) {
    if (event.detail.target?.id === 'mermaid-output') {
      try {
        window.posthog.capture('ontology_view_updated', {
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('PostHog ontology view tracking error:', error)
      }
    }
  })
}

// Initialize tracking when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    // Wait for PostHog to load
    setTimeout(setupPostHogEventTracking, POSTHOG_INIT_DELAY_MS)
  })
} else {
  setTimeout(setupPostHogEventTracking, POSTHOG_INIT_DELAY_MS)
}

// Export for use in other scripts
window.posthogUtils = {
  isReady: isPostHogReady,
  identifyGitHubUser: identifyGitHubUser,
}
