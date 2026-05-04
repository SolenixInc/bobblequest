import type { StripeConfig } from '@t/config'
import Stripe from 'stripe'
import { BillingRepository } from '../entities/ports/BillingRepository.ts'
import type { Entitlement } from '../entities/schemas/EntitlementSchema.ts'
import type { Subscription } from '../entities/schemas/SubscriptionSchema.ts'
import type { RevenueCatWebhookEvent } from '../entities/schemas/WebhookEventSchema.ts'
import type { BillingSource } from '../entities/types/BillingSource.ts'
import { BillingProviderError } from './errors.ts'

/**
 * Minimal logger surface the billing impls need. Accepts anything shaped
 * like `@t/logging`'s `Logger` / `GlobalLogger` â€” we do not import
 * the package at the type level because its module-load path has a known
 * `@/di` alias bug that would pull into tests otherwise. The DI registrar
 * is free to pass a real `createGlobalLogger(...)` instance at runtime.
 */
export interface BillingLogger {
  debug(payload: unknown): void
  info?(payload: unknown): void
  warn?(payload: unknown): void
  warning?(payload: unknown): void
  error(payload: unknown): void
}

/* v8 ignore next 7 */
const NOOP_LOGGER: BillingLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  warning: () => {},
  error: () => {},
}

/**
 * Stripe adapter. Handles server-initiated Checkout and maps Stripe
 * subscription lifecycle events into the normalized entitlement store.
 *
 * Stripe API version is pinned to `2026-03-25.dahlia` to match the active
 * SDK major. Bumping this requires a coordinated migration â€” see
 * https://stripe.com/docs/api/versioning.
 */
export class StripeBillingImpl extends BillingRepository {
  private readonly config: StripeConfig
  private readonly stripeClient: Stripe
  private readonly logger: BillingLogger

  constructor(args: {
    config: StripeConfig
    stripeClient?: Stripe
    logger?: BillingLogger
  }) {
    super()
    if (!args?.config) throw new TypeError('config required')
    this.config = args.config
    this.stripeClient =
      args.stripeClient ??
      new Stripe(args.config.apiKey, {
        apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
      })
    this.logger = args.logger ?? NOOP_LOGGER
  }

  /** Exposed so the composition root can hand the same client to the verifier. */
  getClient(): Stripe {
    return this.stripeClient
  }

  async createCheckoutSession(userId: string, priceId: string): Promise<{ url: string }> {
    if (!userId) throw new TypeError('userId required')
    if (!priceId) throw new TypeError('priceId required')

    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.config.redirectDomain}/billing/success`,
      cancel_url: `${this.config.redirectDomain}/billing/cancel`,
      client_reference_id: userId,
    })

    if (!session.url) {
      throw new BillingProviderError('stripe', 'Stripe did not return a Checkout session URL')
    }
    return { url: session.url }
  }

  /**
   * Stripe has no cheap "entitlements for user" read â€” that lookup lives
   * in the DB read model. The composite impl is responsible for hitting
   * the DB; this method returns `[]` so the composite's `Promise.all`
   * merge produces a pure RevenueCat result when Stripe is unwired.
   *
   * TODO: once `billing_events` / `entitlements` tables land, swap this
   * to a repository read.
   */
  async getEntitlements(_userId: string): Promise<Entitlement[]> {
    return []
  }

  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const normalized = this.normalizeSubscription(sub)
        if (normalized) {
          await this.syncEntitlement(normalized.userId, normalized, 'stripe')
        }
        return
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        this.logger.info?.({
          message: 'stripe invoice.paid',
          metadata: {
            invoiceId: invoice.id,
            customerId: invoice.customer,
          },
        })
        return
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        this.logger.warn?.({
          message: 'stripe invoice.payment_failed â€” entering grace',
          metadata: {
            invoiceId: invoice.id,
            customerId: invoice.customer,
          },
        })
        return
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        this.logger.warn?.({
          message: 'stripe charge.refunded â€” immediate revocation',
          metadata: { chargeId: charge.id },
        })
        return
      }
      default: {
        this.logger.debug({
          message: 'stripe event ignored (unknown type)',
          metadata: { eventType: event.type, eventId: event.id },
        })
        return
      }
    }
  }

  async handleRevenueCatEvent(_event: RevenueCatWebhookEvent): Promise<void> {
    throw new BillingProviderError(
      'stripe',
      'StripeBillingImpl cannot handle RevenueCat events â€” wrong provider',
    )
  }

  async syncEntitlement(
    userId: string,
    subscription: Subscription,
    source: BillingSource,
  ): Promise<void> {
    // TODO: upsert into the `billing_events` + `entitlements` tables once
    // `@t/db` exposes the repository. For scaffold parity we only
    // log the intent.
    this.logger.debug({
      message: 'stripe syncEntitlement (stub)',
      metadata: {
        userId,
        source,
        subscriptionId: subscription.id,
        status: subscription.status,
        productId: subscription.productId,
      },
    })
  }

  /**
   * Project a Stripe.Subscription into the normalized `Subscription` shape.
   * Returns `null` when we can't resolve a platform `userId` from the
   * subscription (e.g. missing `client_reference_id` + unseeded metadata).
   */
  private normalizeSubscription(sub: Stripe.Subscription): Subscription | null {
    const metadata = sub.metadata ?? {}
    const userId =
      metadata.userId ??
      metadata.user_id ??
      (typeof sub.customer === 'string' ? metadata.client_reference_id : undefined)

    if (!userId) {
      this.logger.warn?.({
        message: 'stripe subscription missing userId metadata â€” skipping sync',
        metadata: { subscriptionId: sub.id },
      })
      return null
    }

    const firstItem = sub.items?.data?.[0]
    const productId =
      (firstItem?.price?.product as string | undefined) ?? firstItem?.price?.id ?? sub.id

    const rawItem = firstItem as unknown as
      | {
          current_period_start?: number
          current_period_end?: number
        }
      | undefined
    const startSec =
      rawItem?.current_period_start ??
      (sub as unknown as { current_period_start?: number }).current_period_start ??
      Math.floor(Date.now() / 1000)
    const endSec =
      rawItem?.current_period_end ??
      (sub as unknown as { current_period_end?: number }).current_period_end ??
      startSec

    return {
      id: sub.id,
      userId,
      source: 'stripe',
      status: mapStripeStatus(sub.status),
      productId,
      currentPeriodStart: new Date(startSec * 1000),
      currentPeriodEnd: new Date(endSec * 1000),
      cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    }
  }
}

/**
 * Stripe.Subscription.status â†’ normalized status.
 * See docs/architecture/platform/billing.md â€” Grace periods.
 */
function mapStripeStatus(status: Stripe.Subscription.Status): Subscription['status'] {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'grace'
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelled'
    case 'incomplete':
    case 'paused':
      return 'expired'
    default:
      return 'expired'
  }
}
