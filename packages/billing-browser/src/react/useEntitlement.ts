import * as React from 'react'
import { useBilling } from './useBilling'

export interface EntitlementState {
  /** Whether the entitlement is currently active. */
  isActive: boolean
  /** ISO-8601 expiration date string, or null/undefined if perpetual/unknown. */
  expirationDate?: string | null
  /** True while the initial customer-info fetch is in flight. */
  isLoading: boolean
}

/**
 * Returns the active state of a named entitlement for the current user.
 *
 * Fetches customer info once on mount (and whenever the tracker changes).
 * Returns `isLoading: true` until the fetch resolves.
 *
 * @param entitlementId - The entitlement identifier (e.g. `"pro"`).
 */
export function useEntitlement(entitlementId: string): EntitlementState {
  const tracker = useBilling()

  const [state, setState] = React.useState<EntitlementState>({
    isActive: false,
    expirationDate: null,
    isLoading: true,
  })

  React.useEffect(() => {
    let cancelled = false

    setState((prev) => ({ ...prev, isLoading: true }))

    tracker
      .getCustomerInfo()
      .then((customerInfo) => {
        if (cancelled) return
        const entitlement = customerInfo.entitlements.active[entitlementId]
        setState({
          isActive: entitlement?.isActive ?? false,
          expirationDate: entitlement?.expirationDate ?? null,
          isLoading: false,
        })
      })
      .catch(() => {
        if (cancelled) return
        setState({ isActive: false, expirationDate: null, isLoading: false })
      })

    return () => {
      cancelled = true
    }
  }, [tracker, entitlementId])

  return state
}
