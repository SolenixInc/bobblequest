import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import type Stripe from 'stripe'
import { BillingWebhookSignatureError } from './errors.ts'

/**
 * Verify a Stripe webhook. Wraps `stripe.webhooks.constructEvent`, which
 * throws on any signature mismatch or timestamp-tolerance failure.
 *
 * The raw body MUST be the exact bytes Stripe sent — do NOT parse JSON first.
 * Hono / Express middleware must expose the raw body for this to work.
 */
export function verifyStripeWebhook(args: {
  rawBody: string | Buffer
  signature: string
  secret: string
  stripeClient: Stripe
}): Stripe.Event {
  const { rawBody, signature, secret, stripeClient } = args
  try {
    return stripeClient.webhooks.constructEvent(rawBody, signature, secret)
  } catch (cause) {
    const message =
      cause instanceof Error
        ? `Stripe webhook signature verification failed: ${cause.message}`
        : 'Stripe webhook signature verification failed'
    throw new BillingWebhookSignatureError('stripe', message, { cause })
  }
}

/**
 * Verify a RevenueCat webhook. RC uses an Authorization header shared
 * secret configured in the RC dashboard — NOT an HMAC signature.
 *
 * Comparison is timing-safe on equal-length buffers; unequal lengths short-
 * circuit to `false` before constant-time compare to avoid misuse of
 * `timingSafeEqual` (which throws on length mismatch).
 *
 * The caller passes the raw header value; the expected header is injected
 * at the composition root from `config`.
 */
export function verifyRevenueCatWebhook(args: {
  authorizationHeader: string | null | undefined
  expectedHeader: string
}): void {
  const { authorizationHeader, expectedHeader } = args

  if (typeof authorizationHeader !== 'string' || authorizationHeader.length === 0) {
    throw new BillingWebhookSignatureError(
      'revenuecat',
      'RevenueCat webhook missing Authorization header',
    )
  }

  const incoming = Buffer.from(authorizationHeader, 'utf8')
  const expected = Buffer.from(expectedHeader, 'utf8')

  if (incoming.length !== expected.length) {
    // Do not call timingSafeEqual on unequal-length buffers (it throws).
    throw new BillingWebhookSignatureError(
      'revenuecat',
      'RevenueCat webhook Authorization header mismatch',
    )
  }

  if (!timingSafeEqual(incoming, expected)) {
    throw new BillingWebhookSignatureError(
      'revenuecat',
      'RevenueCat webhook Authorization header mismatch',
    )
  }
}
