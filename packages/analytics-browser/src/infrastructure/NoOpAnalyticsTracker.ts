import type { AnalyticsTracker } from '@t/analytics-types'

/**
 * No-op analytics tracker for testing or when analytics is disabled.
 */
export class NoOpAnalyticsTracker implements AnalyticsTracker {
  capture(
    _event: string,
    _distinctId: string,
    _properties?: Record<string, unknown>,
    _groups?: Record<string, string>,
  ): void {
    // No-op
  }

  captureException(
    _error: Error,
    _distinctId: string,
    _properties?: Record<string, unknown>,
  ): void {
    // No-op
  }

  identify(_distinctId: string, _traits?: Record<string, unknown>): void {
    // No-op
  }

  alias(_distinctId: string, _alias: string): void {
    // No-op
  }

  group(_groupType: string, _groupKey: string, _traits?: Record<string, unknown>): void {
    // No-op
  }

  sessionId(): string {
    return 'no-op-session-id'
  }

  isFeatureEnabled(_key: string, _distinctId: string): Promise<boolean> {
    return Promise.resolve(false)
  }

  getAllFlags(_distinctId: string): Promise<Record<string, boolean | string>> {
    return Promise.resolve({})
  }

  captureRevenue(_event: import('@t/analytics-types').RevenueEvent): void {
    // No-op
  }

  captureLlm(_event: import('@t/analytics-types').LlmEvent): void {
    // No-op
  }

  capturePageView(_url: string): void {
    // No-op
  }

  captureScreen(_screenName: string, _properties?: Record<string, unknown>): void {
    // No-op
  }

  setSuperProperties(_properties: Record<string, unknown>): void {
    // No-op
  }

  clearSuperProperties(): void {
    // No-op
  }

  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}
