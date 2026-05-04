import type { ConfigRepository } from '@t/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NoOpAnalyticsTracker } from '../src/infrastructure/NoOpAnalyticsTracker'
import { PostHogBrowserAnalyticsTracker } from '../src/infrastructure/PostHogBrowserAnalyticsTracker'
import { _resetAnalyticsSingleton, getAnalytics, initAnalytics } from '../src/infrastructure/init'

// Mock config repository using the actual ConfigRepository property shape
const createMockConfig = (overrides: { host?: string } = {}): ConfigRepository =>
  ({
    system: { environment: 'production' },
    analytics: {
      apiKey: 'test-key',
      host: overrides.host !== undefined ? overrides.host : 'https://test.posthog.com',
      enabled: true,
    },
  }) as unknown as ConfigRepository

describe('initAnalytics', () => {
  beforeEach(() => {
    _resetAnalyticsSingleton()
  })

  describe('browser environment', () => {
    it('should return PostHogTracker when key is present', () => {
      vi.stubGlobal('window', {})
      const config = createMockConfig()
      const tracker = initAnalytics(config)
      expect(tracker).toBeInstanceOf(PostHogBrowserAnalyticsTracker)
      vi.unstubAllGlobals()
    })

    it('should return same instance on subsequent calls (singleton)', () => {
      vi.stubGlobal('window', {})
      const config = createMockConfig()
      const tracker1 = initAnalytics(config)
      const tracker2 = initAnalytics(config)
      expect(tracker1).toBe(tracker2)
      vi.unstubAllGlobals()
    })
  })

  describe('non-browser environment', () => {
    it('should return NoOpTracker when window is undefined', () => {
      // Stub window as undefined to simulate SSR / Node.js environment
      vi.stubGlobal('window', undefined)
      const config = createMockConfig()
      const tracker = initAnalytics(config)
      expect(tracker).toBeInstanceOf(NoOpAnalyticsTracker)
      vi.unstubAllGlobals()
    })
  })
})

describe('getAnalytics', () => {
  beforeEach(() => {
    _resetAnalyticsSingleton()
    vi.unstubAllGlobals()
  })

  it('should return NoOpTracker when not initialized', () => {
    const tracker = getAnalytics()
    expect(tracker).toBeInstanceOf(NoOpAnalyticsTracker)
  })

  it('should return initialized tracker after initAnalytics', () => {
    vi.stubGlobal('window', {})
    const config = createMockConfig()
    initAnalytics(config)
    const tracker = getAnalytics()
    expect(tracker).toBeInstanceOf(PostHogBrowserAnalyticsTracker)
    vi.unstubAllGlobals()
  })
})
