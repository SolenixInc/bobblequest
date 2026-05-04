import type Stripe from 'stripe'
import { describe, expect, it } from 'vitest'
import { BillingWebhookSignatureError } from '../../src/infrastructure/errors.ts'
import { verifyStripeWebhook } from '../../src/infrastructure/webhookVerifier.ts'

describe('verifyStripeWebhook — non-Error cause branch (line 26)', () => {
  it('uses fallback message when caught value is not an Error instance', () => {
    const stripeClient = {
      webhooks: {
        constructEvent: () => {
          throw 'plain string thrown by stripe'
        },
      },
    } as unknown as Stripe

    let thrown: unknown
    try {
      verifyStripeWebhook({
        rawBody: 'body',
        signature: 'sig',
        secret: 'secret',
        stripeClient,
      })
    } catch (e) {
      thrown = e
    }

    expect(thrown).toBeInstanceOf(BillingWebhookSignatureError)
    // When cause is not an Error, message is the bare fallback (no colon suffix)
    expect((thrown as BillingWebhookSignatureError).message).toBe(
      'Stripe webhook signature verification failed',
    )
    expect((thrown as BillingWebhookSignatureError).cause).toBe('plain string thrown by stripe')
  })
})
