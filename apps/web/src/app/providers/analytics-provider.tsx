'use client'

import { webClientConfig } from '@/lib/clientConfig'
import { AnalyticsProvider } from '@t/analytics-browser'
import type React from 'react'

// Map WebClientConfig onto the AnalyticsConfig structural shape.
// NEXT_PUBLIC_* vars are already inlined in webClientConfig at module scope.
// Enable analytics only when a real PostHog key is present.
// Placeholder / missing key → enabled:false → NoOp tracker, no posthog.init() call.
const analyticsConfig = {
  analytics: {
    apiKey: webClientConfig.posthog.key ?? '',
    host: webClientConfig.posthog.host,
    enabled: Boolean(webClientConfig.posthog.key),
  },
  system: {
    environment: webClientConfig.environment,
  },
}

export function AppAnalyticsProvider({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider config={analyticsConfig}>{children}</AnalyticsProvider>
}
