import type { BillingTracker } from '@t/billing/ports'
import { NoOpBillingTracker } from './NoOpBillingTracker'

let instance: BillingTracker | null = null
let configuredKey: string | null = null

/**
 * Initialize the billing tracker singleton.
 *
 * Selection order (first match wins):
 *  1. Already initialized with the same API key → return existing instance.
 *  2. `typeof window === 'undefined'` (SSR) → NoOpBillingTracker.
 *  3. `apiKey` is empty/missing → NoOpBillingTracker.
 *  4. Otherwise → RevenueCatBrowserBilling (dynamically imported).
 *
 * @param config.apiKey   - RevenueCat public API key.
 * @param config.appUserId - Optional user identifier passed to RC.
 */
export async function initBillingTracker(config: {
  apiKey: string
  appUserId?: string | null
}): Promise<BillingTracker> {
  const { apiKey, appUserId } = config

  // Idempotent: same key → reuse instance (guard against hot-reload double-init).
  if (instance !== null && configuredKey === apiKey) {
    return instance
  }

  // SSR path — never touch browser-only SDK.
  if (typeof window === 'undefined') {
    instance = new NoOpBillingTracker()
    configuredKey = apiKey
    return instance
  }

  // Missing key → NoOp fallback.
  if (!apiKey) {
    console.warn(
      'Billing disabled: RevenueCat publicApiKey is not set. Falling back to NoOpBillingTracker.',
    )
    instance = new NoOpBillingTracker()
    configuredKey = apiKey
    return instance
  }

  // Browser + valid key → real RC adapter (dynamic import keeps SSR safe).
  const { RevenueCatBrowserBilling } = await import('./RevenueCatBrowserBilling')
  const tracker = new RevenueCatBrowserBilling()
  await tracker.configure({ apiKey, appUserId: appUserId ?? undefined })
  instance = tracker
  configuredKey = apiKey
  return instance
}

/**
 * Return the current billing tracker singleton.
 * Throws if `initBillingTracker` has not been called yet.
 */
export function getBillingTracker(): BillingTracker {
  if (instance === null) {
    throw new Error('BillingTracker has not been initialized. Call initBillingTracker() first.')
  }
  return instance
}

/**
 * Reset the billing singleton (for testing purposes only).
 * @internal
 */
export function _resetForTests(): void {
  instance = null
  configuredKey = null
}
