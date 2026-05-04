import type { BillingTracker, CustomerInfo } from '@t/billing/ports'

/**
 * No-op billing tracker for SSR, testing, or when the RevenueCat API key
 * is not configured. All operations resolve immediately without side effects.
 */
export class NoOpBillingTracker implements BillingTracker {
  configure(_opts: { apiKey: string; appUserId?: string }): void {
    // No-op
  }

  getCustomerInfo(): Promise<CustomerInfo> {
    return Promise.resolve({
      entitlements: {
        active: {},
      },
    })
  }

  purchase(_input: { packageId: string }): Promise<{ ok: true }> {
    return Promise.resolve({ ok: true })
  }
}
