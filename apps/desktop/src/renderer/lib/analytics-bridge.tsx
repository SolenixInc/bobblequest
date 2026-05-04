import { useUser } from '@clerk/clerk-react'
import posthog from 'posthog-js'
import { useEffect } from 'react'

/**
 * Bridges Clerk authentication state into PostHog analytics.
 *
 * - Identifies the PostHog person when a Clerk user is signed in.
 * - Resets PostHog identity when the user signs out.
 *
 * Rendered once inside the provider tree (see providers.tsx).
 */
export function ClerkAnalyticsBridge() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return

    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
      })
    } else {
      posthog.reset()
    }
  }, [user, isLoaded])

  return null
}
