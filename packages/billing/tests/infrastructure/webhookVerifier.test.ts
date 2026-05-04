import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'
import { BillingWebhookSignatureError } from '../../src/infrastructure/errors.ts'
import {
  verifyRevenueCatWebhook,
  verifyStripeWebhook,
} from '../../src/infrastructure/webhookVerifier.ts'

const TEST_SECRET = 'whsec_test_secret'

function makeStripeClient(): Stripe {
  return new Stripe('sk_test_dummy', {
    apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
  })
}

describe('verifyStripeWebhook', () => {
  it('returns the event when the signature is valid', () => {
    const client = makeStripeClient()
    const payload = JSON.stringify({
      id: 'evt_test',
      object: 'event',
      type: 'customer.subscription.created',
      data: { object: {} },
    })
    const signature = client.webhooks.generateTestHeaderString({
      payload,
      secret: TEST_SECRET,
    })
    const event = verifyStripeWebhook({
      rawBody: payload,
      signature,
      secret: TEST_SECRET,
      stripeClient: client,
    })
    expect(event.id).toBe('evt_test')
    expect(event.type).toBe('customer.subscription.created')
  })

  it('throws BillingWebhookSignatureError when the signature is tampered', () => {
    const client = makeStripeClient()
    const payload = JSON.stringify({
      id: 'evt_test',
      object: 'event',
      type: 'customer.subscription.created',
      data: { object: {} },
    })
    const signature = client.webhooks.generateTestHeaderString({
      payload,
      secret: TEST_SECRET,
    })
    // Flip a single hex char of the signature component.
    const tampered = signature.replace(/,v1=([0-9a-f])/, (_m, c) => {
      const flipped = c === 'a' ? 'b' : 'a'
      return `,v1=${flipped}`
    })
    expect(() =>
      verifyStripeWebhook({
        rawBody: payload,
        signature: tampered,
        secret: TEST_SECRET,
        stripeClient: client,
      }),
    ).toThrow(BillingWebhookSignatureError)
  })
})

describe('verifyRevenueCatWebhook', () => {
  it('passes when headers match exactly', () => {
    expect(() =>
      verifyRevenueCatWebhook({
        authorizationHeader: 'shared-secret-abc',
        expectedHeader: 'shared-secret-abc',
      }),
    ).not.toThrow()
  })

  it('throws on mismatched same-length headers', () => {
    expect(() =>
      verifyRevenueCatWebhook({
        authorizationHeader: 'shared-secret-xyz',
        expectedHeader: 'shared-secret-abc',
      }),
    ).toThrow(BillingWebhookSignatureError)
  })

  it('throws on different-length headers without timing leak', () => {
    expect(() =>
      verifyRevenueCatWebhook({
        authorizationHeader: 'short',
        expectedHeader: 'this-is-a-much-longer-secret',
      }),
    ).toThrow(BillingWebhookSignatureError)
  })

  it('throws when the header is missing', () => {
    expect(() =>
      verifyRevenueCatWebhook({
        authorizationHeader: null,
        expectedHeader: 'anything',
      }),
    ).toThrow(BillingWebhookSignatureError)
  })
})
