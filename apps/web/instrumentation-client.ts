import { initAnalytics } from '@t/analytics-browser'
import type { ConfigRepository } from '@t/config'

// Build a minimal ConfigRepository-compatible object from NEXT_PUBLIC_* env vars.
// These are inlined by Next.js at build time and available on the client.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

const browserConfig = {
  system: {
    environment: (process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'production') as
      | 'development'
      | 'local'
      | 'testing'
      | 'production',
    logLevel: 'info' as const,
    isLocal:
      process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ||
      process.env.NEXT_PUBLIC_ENVIRONMENT === 'local',
    port: 3000,
  },
  analytics: {
    apiKey: posthogKey ?? '',
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // Only enable when a real key is present — empty/placeholder → NoOp tracker.
    enabled: Boolean(posthogKey),
  },
} as unknown as ConfigRepository

initAnalytics(browserConfig)
