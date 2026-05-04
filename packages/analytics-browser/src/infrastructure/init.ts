import type { AnalyticsTracker, Environment } from '@t/analytics-types'
import type { AnalyticsConfig } from '../types'
import { NoOpAnalyticsTracker } from './NoOpAnalyticsTracker'
import { PostHogBrowserAnalyticsTracker } from './PostHogBrowserAnalyticsTracker'

let instance: AnalyticsTracker | null = null

/**
 * Initialize the analytics tracker singleton.
 * Reads analytics config from a structurally typed config object.
 * Returns the same instance on subsequent calls.
 *
 * @param config - Config object with `analytics` and `system` fields
 * @returns AnalyticsTracker instance (PostHog or NoOp)
 */
export function initAnalytics(config: AnalyticsConfig): AnalyticsTracker {
  if (instance !== null) {
    return instance
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    instance = new NoOpAnalyticsTracker()
    return instance
  }

  const analytics = config.analytics
  const posthogKey = analytics.apiKey
  const posthogHost = analytics.host

  // posthogKey is guaranteed non-empty by schema validation at boot.
  // If this is ever falsy it is a programming error, not a config opt-out.
  instance = new PostHogBrowserAnalyticsTracker({
    environment: config.system.environment as Environment,
    service: 'web',
    apiKey: posthogKey,
    host: posthogHost,
    enabled: analytics.enabled,
    bootstrap: analytics.bootstrap,
    sessionRecording: analytics.sessionRecording,
  })

  return instance
}

/**
 * Get the analytics tracker singleton.
 * Returns NoOp instance if not yet initialized.
 *
 * In practice, initAnalytics should be called first at app startup.
 *
 * @returns AnalyticsTracker instance
 */
export function getAnalytics(): AnalyticsTracker {
  if (instance === null) {
    instance = new NoOpAnalyticsTracker()
  }
  return instance
}

/**
 * Reset the analytics singleton (for testing purposes only).
 * @internal
 */
export function _resetAnalyticsSingleton(): void {
  instance = null
}
