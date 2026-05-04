import type { RevenueCatConfig } from '@t/config'
import type Stripe from 'stripe'
import { BillingRepository } from '../entities/ports/BillingRepository.ts'
import type { Entitlement } from '../entities/schemas/EntitlementSchema.ts'
import type { Subscription } from '../entities/schemas/SubscriptionSchema.ts'
import type { RevenueCatWebhookEvent } from '../entities/schemas/WebhookEventSchema.ts'
import type { BillingSource } from '../entities/types/BillingSource.ts'
import type { BillingLogger } from './StripeBillingImpl.ts'
import { BillingProviderError } from './errors.ts'

/* v8 ignore next 7 */
const NOOP_LOGGER: BillingLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  warning: () => {},
  error: () => {},
}

const RC_API_BASE = 'https://api.revenuecat.com/v1'

type RevenueCatEntitlement = {
  product_identifier: string
  expires_date_ms: number | null
  // RC sends `grace_period_expires_date_ms` when a subscription is in a
  // payment-retry window.
  grace_period_expires_date_ms?: number | null
  unsubscribe_detected_at_ms?: number | null
  billing_issues_detected_at_ms?: number | null
}

type RevenueCatSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>
  }
}

/**
 * RevenueCat adapter. Handles webhook lifecycle events and a REST-based
 * entitlement read path. RevenueCat has no official Node SDK â€” we use the
 * global `fetch()` built in to Bun / Node 20+.
 */
export class RevenueCatBillingImpl extends BillingRepository {
  private readonly config: RevenueCatConfig
  private readonly webhookAuthHeader: string
  private readonly httpFetch: typeof fetch
  private readonly logger: BillingLogger

  constructor(args: {
    config: RevenueCatConfig
    webhookAuthHeader: string
    httpFetch?: typeof fetch
    logger?: BillingLogger
  }) {
    super()
    if (!args?.config) throw new TypeError('config required')
    if (!args?.webhookAuthHeader) {
      throw new TypeError('webhookAuthHeader required')
    }
    this.config = args.config
    this.webhookAuthHeader = args.webhookAuthHeader
    this.httpFetch = args.httpFetch ?? fetch
    this.logger = args.logger ?? NOOP_LOGGER
  }

  /** Exposed for the webhook verifier at the composition root. */
  getExpectedWebhookAuthHeader(): string {
    return this.webhookAuthHeader
  }

  async createCheckoutSession(_userId: string, _priceId: string): Promise<{ url: string }> {
    throw new BillingProviderError(
      'revenuecat',
      'RevenueCat does not support server-initiated checkout â€” ' +
        'purchases flow through the RC SDK on-device.',
    )
  }

  async getEntitlements(userId: string): Promise<Entitlement[]> {
    if (!userId) throw new TypeError('userId required')
    const url = `${RC_API_BASE}/subscribers/${encodeURIComponent(userId)}`
    const res = await this.httpFetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        Accept: 'application/json',
      },
    })

    if (res.status === 404) return []

    if (!res.ok) {
      throw new BillingProviderError(
        'revenuecat',
        `RevenueCat GET /subscribers failed: ${res.status}`,
      )
    }

    const body = (await res.json()) as RevenueCatSubscriberResponse
    const entitlementsObj = body.subscriber?.entitlements ?? {}
    const now = Date.now()

    return Object.entries(entitlementsObj).map(([_key, ent]) => {
      const status = mapRevenueCatEntitlementStatus(ent, now)
      const expiresAt =
        typeof ent.expires_date_ms === 'number' ? new Date(ent.expires_date_ms) : null
      return {
        userId,
        productId: ent.product_identifier,
        source: 'revenuecat' as const,
        status,
        expiresAt,
      } satisfies Entitlement
    })
  }

  async handleStripeEvent(_event: Stripe.Event): Promise<void> {
    throw new BillingProviderError(
      'revenuecat',
      'RevenueCatBillingImpl cannot handle Stripe events â€” wrong provider',
    )
  }

  async handleRevenueCatEvent(event: RevenueCatWebhookEvent): Promise<void> {
    const inner = event.event
    const status = mapRevenueCatEventStatus(inner.type)

    const expiresAt =
      typeof inner.expiration_at_ms === 'number' ? new Date(inner.expiration_at_ms) : null
    const now = new Date(inner.event_timestamp_ms)

    const subscription: Subscription = {
      id: inner.id,
      userId: inner.app_user_id,
      source: 'revenuecat',
      status,
      productId: inner.product_id,
      currentPeriodStart: now,
      currentPeriodEnd: expiresAt ?? now,
      cancelAt: status === 'cancelled' ? now : null,
    }

    await this.syncEntitlement(inner.app_user_id, subscription, 'revenuecat')
  }

  async syncEntitlement(
    userId: string,
    subscription: Subscription,
    source: BillingSource,
  ): Promise<void> {
    // TODO: upsert into the `billing_events` + `entitlements` tables once
    // `@t/db` exposes the repository.
    this.logger.debug({
      message: 'revenuecat syncEntitlement (stub)',
      metadata: {
        userId,
        source,
        subscriptionId: subscription.id,
        status: subscription.status,
        productId: subscription.productId,
      },
    })
  }
}

function mapRevenueCatEventStatus(
  type: RevenueCatWebhookEvent['event']['type'],
): Subscription['status'] {
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'NON_RENEWING_PURCHASE':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      return 'active'
    case 'BILLING_ISSUE':
      return 'grace'
    case 'CANCELLATION':
      return 'cancelled'
    case 'EXPIRATION':
      return 'expired'
    /* v8 ignore next 5 — exhaustiveness guard; TypeScript prevents reaching this at runtime */
    default: {
      const _exhaustive: never = type
      void _exhaustive
      return 'expired'
    }
  }
}

/**
 * Project a single RC entitlement object (from `/v1/subscribers`) into one
 * of our four canonical statuses. Billing-issue wins over expiry because
 * "grace" is a superset-of-active state.
 */
function mapRevenueCatEntitlementStatus(
  ent: RevenueCatEntitlement,
  nowMs: number,
): Entitlement['status'] {
  if (ent.billing_issues_detected_at_ms) return 'grace'
  if (ent.unsubscribe_detected_at_ms) return 'cancelled'
  if (typeof ent.expires_date_ms === 'number' && ent.expires_date_ms < nowMs) {
    return 'expired'
  }
  return 'active'
}
