import type { BillingTracker } from '@t/billing/ports'
import * as React from 'react'
import { BillingContext } from './BillingProvider'

/**
 * Returns the active BillingTracker from context.
 * Must be used within a BillingProvider.
 *
 * @throws if called outside of a BillingProvider.
 */
export function useBilling(): BillingTracker {
  const tracker = React.useContext(BillingContext)
  if (tracker === null) {
    throw new Error('useBilling must be used within a BillingProvider')
  }
  return tracker
}
