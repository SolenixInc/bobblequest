import * as React from 'react'
import { useAnalytics } from './useAnalytics'

/**
 * Hook to capture a screen view event.
 * Calls analytics.captureScreen on mount and whenever screenName changes.
 *
 * @param screenName - The name of the screen
 * @param properties - Optional screen properties
 */
export const useScreen = (screenName: string, properties?: Record<string, unknown>) => {
  const analytics = useAnalytics()

  React.useEffect(() => {
    if (!screenName) return

    analytics.captureScreen(screenName, properties)
  }, [screenName, properties, analytics])
}
