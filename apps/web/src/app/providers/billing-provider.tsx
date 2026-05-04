'use client'

import { webClientConfig } from '@/lib/clientConfig'
import { useAuth } from '@clerk/nextjs'
import { BillingProvider } from '@t/billing-browser'
import type React from 'react'

// Map webClientConfig onto BillingConfig, providing a string fallback for the
// optional publicApiKey (absent key → NoOpBillingTracker via billing-browser's
// initBillingTracker guard).
const billingConfig = {
  revenueCat: {
    publicApiKey: webClientConfig.revenueCat.publicApiKey ?? '',
  },
  environment: webClientConfig.environment,
}

/**
 * Inner billing provider that reads the authenticated userId from Clerk.
 * Only rendered when ClerkProvider is present in the tree.
 */
function AuthedBillingProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth()
  return (
    <BillingProvider config={billingConfig} userId={userId}>
      {children}
    </BillingProvider>
  )
}

/**
 * App-level billing provider.
 *
 * When Clerk is configured (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY present and
 * ClerkProvider is in the tree), delegates to AuthedBillingProvider which
 * reads useAuth() for the authenticated userId.
 *
 * When Clerk is absent (fresh clone / placeholder env), falls back to
 * BillingProvider with no userId so the billing SDK uses an anonymous ID.
 * This mirrors the isClerkConfigured() gate in layout.tsx and prevents
 * the "useAuth can only be used within the <ClerkProvider /> component"
 * error when CLERK_SECRET_KEY is not set.
 */
export function AppBillingProvider({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(webClientConfig.clerk.publishableKey)

  if (!clerkConfigured) {
    return (
      <BillingProvider config={billingConfig} userId={null}>
        {children}
      </BillingProvider>
    )
  }

  return <AuthedBillingProvider>{children}</AuthedBillingProvider>
}
