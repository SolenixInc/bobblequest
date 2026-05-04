'use client'

import { AnalyticsProvider, type AnalyticsConfig } from '@t/analytics-browser'
import type React from 'react'

// Enable analytics only when a real PostHog key is present.
// With placeholder / empty env var, enabled:false → NoOp tracker, no posthog.init() call.
// Replace the empty placeholder in .env.docker.example with a real phc_* key to enable.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const analyticsConfig: AnalyticsConfig = {
  analytics: {
    // Next.js inlines NEXT_PUBLIC_* at build time — explicit property access required.
    apiKey: posthogKey ?? '',
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    enabled: Boolean(posthogKey),
  },
  system: {
    environment:
      (process.env.NEXT_PUBLIC_ENVIRONMENT as AnalyticsConfig['system']['environment']) ??
      'production',
  },
}

export function AppAnalyticsProvider({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider config={analyticsConfig}>{children}</AnalyticsProvider>
}
