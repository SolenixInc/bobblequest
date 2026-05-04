'use client'

import type { BillingTracker, CustomerInfo } from '@t/billing/ports'

/**
 * RevenueCat browser billing adapter.
 *
 * This file is intentionally browser-only. The RC SDK
 * (`@revenuecat/purchases-js`) is dynamically imported inside `configure()`
 * so that importing this module in an SSR context does NOT crash the server
 * (the dynamic import is never executed when window is absent, because
 * `init.ts` selects NoOpBillingTracker on the server path instead).
 *
 * When the configured userId changes, `Purchases.changeUser(newUserId)` is
 * called rather than re-calling `configure` (which is single-shot on the
 * RC SDK).
 */
export class RevenueCatBrowserBilling implements BillingTracker {
  private configured = false

  async configure(opts: { apiKey: string; appUserId?: string }): Promise<void> {
    const { Purchases } = await import('@revenuecat/purchases-js')

    if (!this.configured && opts.appUserId) {
      // RC web SDK requires an appUserId at configure time.
      // Defer configuration until the caller provides one.
      Purchases.configure({
        apiKey: opts.apiKey,
        appUserId: opts.appUserId as string,
      })
      this.configured = true
    } else if (this.configured && opts.appUserId) {
      // SDK is already configured — switch user identity only.
      await Purchases.getSharedInstance().changeUser(opts.appUserId)
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    const { Purchases } = await import('@revenuecat/purchases-js')
    const rcCustomerInfo = await Purchases.getSharedInstance().getCustomerInfo()

    // Map RC's entitlements.active shape to the port's CustomerInfo shape.
    const active: Record<
      string,
      { identifier: string; isActive: boolean; expirationDate?: string | null }
    > = {}

    for (const [id, info] of Object.entries(rcCustomerInfo.entitlements.active)) {
      active[id] = {
        identifier: info.identifier,
        isActive: info.isActive,
        expirationDate:
          info.expirationDate instanceof Date
            ? info.expirationDate.toISOString()
            : (info.expirationDate ?? null),
      }
    }

    return { entitlements: { active } }
  }

  async purchase(input: { packageId: string }): Promise<{ ok: true }> {
    const { Purchases } = await import('@revenuecat/purchases-js')

    const offerings = await Purchases.getSharedInstance().getOfferings()
    const current = offerings.current

    if (!current) {
      throw new Error('No current offering available')
    }

    const rcPackage = current.availablePackages.find((p) => p.identifier === input.packageId)

    if (!rcPackage) {
      throw new Error(`Package "${input.packageId}" not found in current offering`)
    }

    await Purchases.getSharedInstance().purchase({ rcPackage })
    return { ok: true }
  }
}
