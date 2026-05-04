'use client'

import type { BillingTracker } from '@t/billing/ports'
import * as React from 'react'
import { getBillingTracker, initBillingTracker } from '../infrastructure/init'

/**
 * Minimal config shape accepted by BillingProvider.
 * Structurally compatible with WebClientConfig from @t/config so consumers
 * can pass that object directly.
 */
export interface BillingConfig {
  revenueCat: {
    publicApiKey: string
  }
  environment?: string
}

/**
 * React context holding the active BillingTracker instance.
 */
const BillingContext = React.createContext<BillingTracker | null>(null)

export interface BillingProviderProps {
  config: BillingConfig
  /**
   * Authenticated user ID from the auth layer (e.g. Clerk's userId).
   * When null/undefined an anonymous RC ID is used. Re-init fires whenever
   * this changes.
   */
  userId?: string | null
  children: React.ReactNode
}

/**
 * React provider that initializes the billing tracker on mount and re-initializes
 * whenever `userId` changes. Children can call `useBilling()` to access the tracker.
 */
export function BillingProvider({ config, userId, children }: BillingProviderProps) {
  const [tracker, setTracker] = React.useState<BillingTracker | null>(null)
  const prevUserIdRef = React.useRef<string | null | undefined>(undefined)

  React.useEffect(() => {
    // Only re-init when userId actually changes (not on every render).
    if (tracker !== null && prevUserIdRef.current === userId) {
      return
    }

    const apiKey = config.revenueCat.publicApiKey

    initBillingTracker({ apiKey, appUserId: userId })
      .then((t) => {
        setTracker(t)
        prevUserIdRef.current = userId
      })
      .catch((err) => {
        console.warn('BillingProvider: failed to initialize billing tracker:', err)
        // Attempt to surface whatever was previously initialized, or set null.
        try {
          setTracker(getBillingTracker())
        } catch {
          setTracker(null)
        }
        prevUserIdRef.current = userId
      })
  }, [config, userId, tracker])

  if (tracker === null) {
    return null
  }

  return <BillingContext.Provider value={tracker}>{children}</BillingContext.Provider>
}

/**
 * @internal — re-exported from index for convenience.
 */
export { BillingContext }
