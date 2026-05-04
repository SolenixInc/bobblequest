import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { AnalyticsConfig } from '@t/analytics-browser'
import type React from 'react'

// analyticsConfig in the source is computed at module scope, so we must reset
// the module registry between the two cases and re-import fresh each time.

afterEach(() => {
  cleanup()
  vi.resetModules()
})

/**
 * Bootstrap a fresh module graph with the given posthog key value.
 * Returns the captured config prop that the sentinel AnalyticsProvider received.
 */
async function renderWithKey(posthogKey: string | undefined): Promise<AnalyticsConfig> {
  let capturedConfig: AnalyticsConfig | null = null

  vi.doMock('@t/analytics-browser', () => ({
    AnalyticsProvider: ({
      children,
      config,
    }: {
      children: React.ReactNode
      config: AnalyticsConfig
    }) => {
      capturedConfig = config
      return <>{children}</>
    },
  }))

  vi.doMock('@/lib/clientConfig', () => ({
    webClientConfig: {
      posthog: { key: posthogKey, host: 'https://us.i.posthog.com' },
      clerk: { publishableKey: undefined },
      trpc: { url: 'http://localhost:3000/trpc' },
      revenueCat: { publicApiKey: undefined },
      environment: 'test',
    },
  }))

  const { AppAnalyticsProvider } = await import('../analytics-provider.js')
  render(<AppAnalyticsProvider>child</AppAnalyticsProvider>)

  if (capturedConfig === null) {
    throw new Error('AnalyticsProvider sentinel was never called — check the mock')
  }

  return capturedConfig
}

describe('AppAnalyticsProvider', () => {
  describe('with a populated posthog key', () => {
    test('passes enabled=true to AnalyticsProvider', async () => {
      const config = await renderWithKey('phc_test_key')
      expect(config.analytics.enabled).toBe(true)
    })
  })

  describe('with a missing posthog key', () => {
    test('passes enabled=false to AnalyticsProvider', async () => {
      const config = await renderWithKey(undefined)
      expect(config.analytics.enabled).toBe(false)
    })
  })
})
