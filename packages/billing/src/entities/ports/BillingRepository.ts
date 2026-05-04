import type Stripe from 'stripe'
import type { Entitlement } from '../schemas/EntitlementSchema.ts'
import type { Subscription } from '../schemas/SubscriptionSchema.ts'
import type { RevenueCatWebhookEvent } from '../schemas/WebhookEventSchema.ts'
import type { BillingSource } from '../types/BillingSource.ts'

/**
 * Canonical billing port. Implementations adapt this surface to one or more
 * providers (Stripe, RevenueCat, a composite of both). Consumers — apps and
 * other packages — depend ONLY on this port, never on a concrete impl or
 * provider SDK.
 *
 * Method contract matches `docs/architecture/platform/billing.md`.
 */
export abstract class BillingRepository {
  /**
   * Create a hosted Checkout session for a user against a given price.
   *
   * Stripe-only: RevenueCat purchases are initiated client-side via the
   * RC SDK, never server-side. A RevenueCat impl MUST throw.
   *
   * Returns the URL the client should redirect the user to.
   */
  abstract createCheckoutSession(userId: string, priceId: string): Promise<{ url: string }>

  /**
   * Read every active / grace / expired / cancelled entitlement for a user,
   * unified across providers. A composite impl merges rows from each lane.
   */
  abstract getEntitlements(userId: string): Promise<Entitlement[]>

  /**
   * Ingest a verified Stripe webhook event. The caller is responsible for
   * signature verification (see {@link verifyStripeWebhook}) — this method
   * assumes `event` is authentic.
   */
  abstract handleStripeEvent(event: Stripe.Event): Promise<void>

  /**
   * Ingest a verified RevenueCat webhook event. The caller is responsible
   * for signature verification (see {@link verifyRevenueCatWebhook}).
   */
  abstract handleRevenueCatEvent(event: RevenueCatWebhookEvent): Promise<void>

  /**
   * Upsert a subscription into the entitlement store. Called by the
   * `handle*Event` methods after normalization. `source` is persisted on
   * the row so the read side can distinguish lanes.
   */
  abstract syncEntitlement(
    userId: string,
    subscription: Subscription,
    source: BillingSource,
  ): Promise<void>
}
