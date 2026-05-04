import type { AnalyticsTracker, Environment } from '@t/analytics-types'
import type { AnalyticsConfig } from '../types'
import { NoOpAnalyticsTracker } from './NoOpAnalyticsTracker'
import { PostHogRnAnalyticsTracker } from './PostHogRnAnalyticsTracker'

let instance: AnalyticsTracker | null = null

/**
 * Initialize the analytics tracker singleton.
 * Reads analytics config from a structurally typed config object.
 * Returns the same instance on subsequent calls.
 *
 * @param config - Config object with `analytics` and `system` fields
 * @returns AnalyticsTracker instance (PostHog RN or NoOp)
 */
export function initAnalytics(config: AnalyticsConfig): AnalyticsTracker {
  if (instance !== null) {
    return instance
  }

  const analytics = config.analytics
  const posthogKey = analytics.apiKey
  const posthogHost = analytics.host

  if (!posthogKey) {
    console.warn(
      'Analytics disabled: posthog apiKey is not set. Falling back to NoOpAnalyticsTracker.',
    )
    instance = new NoOpAnalyticsTracker()
    return instance
  }

  instance = new PostHogRnAnalyticsTracker({
    environment: config.system.environment as Environment,
    service: 'mobile',
    apiKey: posthogKey,
    host: posthogHost,
    enabled: analytics.enabled,
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
