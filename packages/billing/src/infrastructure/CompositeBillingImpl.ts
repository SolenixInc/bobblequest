import type Stripe from 'stripe'
import { BillingRepository } from '../entities/ports/BillingRepository.ts'
import type { Entitlement } from '../entities/schemas/EntitlementSchema.ts'
import type { Subscription } from '../entities/schemas/SubscriptionSchema.ts'
import type { RevenueCatWebhookEvent } from '../entities/schemas/WebhookEventSchema.ts'
import type { BillingSource } from '../entities/types/BillingSource.ts'
import type { RevenueCatBillingImpl } from './RevenueCatBillingImpl.ts'
import type { StripeBillingImpl } from './StripeBillingImpl.ts'
import { BillingProviderError } from './errors.ts'

/**
 * Composite impl that routes port calls to the correct lane.
 *
 *  - Checkout creation: Stripe only (server-initiated).
 *  - Entitlement read : union of both lanes.
 *  - Webhooks         : dispatched by provider.
 *  - `syncEntitlement`: dispatched by the `source` field.
 *
 * This is the binding registered in `registerBillingDI`.
 */
export class CompositeBillingImpl extends BillingRepository {
  private readonly stripe: StripeBillingImpl
  private readonly revenuecat: RevenueCatBillingImpl

  constructor(args: {
    stripe: StripeBillingImpl
    revenuecat: RevenueCatBillingImpl
  }) {
    super()
    if (!args?.stripe) throw new TypeError('stripe impl required')
    if (!args?.revenuecat) throw new TypeError('revenuecat impl required')
    this.stripe = args.stripe
    this.revenuecat = args.revenuecat
  }

  createCheckoutSession(userId: string, priceId: string): Promise<{ url: string }> {
    return this.stripe.createCheckoutSession(userId, priceId)
  }

  async getEntitlements(userId: string): Promise<Entitlement[]> {
    const [fromStripe, fromRC] = await Promise.all([
      this.stripe.getEntitlements(userId),
      this.revenuecat.getEntitlements(userId),
    ])
    // Union — a user with active entitlements from both providers sees
    // both rows (see billing.md — Cross-provider entitlement portability).
    return [...fromStripe, ...fromRC]
  }

  handleStripeEvent(event: Stripe.Event): Promise<void> {
    return this.stripe.handleStripeEvent(event)
  }

  handleRevenueCatEvent(event: RevenueCatWebhookEvent): Promise<void> {
    return this.revenuecat.handleRevenueCatEvent(event)
  }

  syncEntitlement(
    userId: string,
    subscription: Subscription,
    source: BillingSource,
  ): Promise<void> {
    switch (source) {
      case 'stripe':
        return this.stripe.syncEntitlement(userId, subscription, source)
      case 'revenuecat':
        return this.revenuecat.syncEntitlement(userId, subscription, source)
      default: {
        const _exhaustive: never = source
        void _exhaustive
        throw new BillingProviderError('stripe', `Unknown billing source: ${String(source)}`)
      }
    }
  }
}
