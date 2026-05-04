'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import * as React from 'react'
import { getAnalytics, initAnalytics } from '../infrastructure/init'
import type { AnalyticsConfig } from '../types'

/**
 * React context for analytics tracker.
 */
const AnalyticsContext = React.createContext<ReturnType<typeof getAnalytics> | null>(null)

interface AnalyticsProviderProps {
  children: React.ReactNode
  /**
   * Structurally typed config — compatible with ConfigRepository from @t/config
   * and WebClientConfig from @t/config/browser. Only `analytics` and `system`
   * fields are read; see AnalyticsConfig in ../types.
   */
  config: AnalyticsConfig
}

/**
 * React context provider for analytics tracker.
 * Initializes analytics on mount (if not already initialized) and provides the tracker instance via context.
 * Wraps children with PostHogProvider from posthog-js/react.
 */
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children, config }) => {
  const [analyticsInitialized, setAnalyticsInitialized] = React.useState(false)

  React.useEffect(() => {
    // Only initialize in browser environment
    /* v8 ignore next 4 */
    if (typeof window === 'undefined') {
      setAnalyticsInitialized(true)
      return
    }

    try {
      // Initialize analytics with config (creates singleton if not exists)
      initAnalytics(config)
      setAnalyticsInitialized(true)
    } catch (error) {
      console.warn('Failed to initialize analytics:', error)
      setAnalyticsInitialized(true) // Still set to true to avoid infinite loops
    }
  }, [config])

  if (!analyticsInitialized) {
    return null // Render nothing while initializing
  }

  const analytics = getAnalytics()

  return (
    <AnalyticsContext.Provider value={analytics}>
      <PostHogProvider client={posthog}>{children}</PostHogProvider>
    </AnalyticsContext.Provider>
  )
}

/**
 * Hook to consume analytics tracker context.
 * Must be used within AnalyticsProvider.
 */
export const useAnalytics = () => {
  const context = React.useContext(AnalyticsContext)
  if (context === null) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}
