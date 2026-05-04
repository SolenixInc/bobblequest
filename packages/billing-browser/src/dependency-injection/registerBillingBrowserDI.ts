import type { BillingTracker } from '@t/billing/ports'
import { type Container, asClass } from '@t/dependency-injection'
import { NoOpBillingTracker } from '../infrastructure/NoOpBillingTracker'
import { RevenueCatBrowserBilling } from '../infrastructure/RevenueCatBrowserBilling'

/**
 * Minimal browser-safe config accessor used by the DI registrar.
 */
export interface BrowserConfigAccessor {
  get(key: string): string | undefined
}

export interface RegisterBillingBrowserDIOptions {
  /** Browser config accessor providing NEXT_PUBLIC_* values. */
  readonly config: BrowserConfigAccessor
  /** If true, forces NoOpBillingTracker regardless of config. */
  readonly noOp?: boolean
}

/**
 * Registers the billing bindings in the DI container for browser usage.
 *
 * Selection order for the tracker (first match wins):
 *  1. `options.noOp === true` → NoOpBillingTracker.
 *  2. `typeof window === 'undefined'` (SSR) → NoOpBillingTracker.
 *  3. `!config.get('NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY')` → NoOpBillingTracker + warning.
 *  4. otherwise → RevenueCatBrowserBilling.
 *
 * Lifetime: singleton.
 */
export function registerBillingBrowserDI(
  container: Container,
  opts: RegisterBillingBrowserDIOptions,
): void {
  const { config, noOp = false } = opts
  const rcApiKey = config.get('NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY')

  const TrackerClass: new () => BillingTracker = pickTracker({ noOp, rcApiKey })

  container.register({
    billingTracker: asClass(TrackerClass).singleton(),
  })
}

function pickTracker(args: {
  noOp: boolean
  rcApiKey: string | undefined
}): new () => BillingTracker {
  const { noOp, rcApiKey } = args

  if (noOp) {
    return class ForcedNoOp extends NoOpBillingTracker {}
  }

  if (typeof window === 'undefined') {
    return class ServerNoOp extends NoOpBillingTracker {}
  }

  if (!rcApiKey) {
    console.warn(
      'Billing disabled: NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY is not set. ' +
        'Falling back to NoOpBillingTracker.',
    )
    return class MissingKeyNoOp extends NoOpBillingTracker {}
  }

  return RevenueCatBrowserBilling
}
