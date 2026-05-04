import * as React from 'react'
import { useAnalytics } from './useAnalytics'

/**
 * Hook to identify a user in analytics.
 * Calls analytics.identify on mount and whenever userId changes.
 *
 * @param userId - The user's unique identifier
 * @param traits - Optional user traits (e.g., name, email)
 */
export const useIdentify = (userId: string | undefined, traits?: Record<string, unknown>) => {
  const analytics = useAnalytics()

  React.useEffect(() => {
    if (!userId) return

    analytics.identify(userId, traits)
  }, [userId, traits, analytics])
}
