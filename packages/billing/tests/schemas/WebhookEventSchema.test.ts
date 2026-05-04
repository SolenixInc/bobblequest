import { describe, expect, it } from 'vitest'
import {
  RevenueCatEventTypeSchema,
  RevenueCatWebhookEventSchema,
} from '../../src/entities/schemas/WebhookEventSchema.ts'
import billingIssueFixture from '../fixtures/revenuecatBillingIssue.json' with { type: 'json' }
import initialPurchaseFixture from '../fixtures/revenuecatInitialPurchase.json' with {
  type: 'json',
}

describe('RevenueCatEventTypeSchema', () => {
  it('accepts all known event types', () => {
    const known = [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'CANCELLATION',
      'EXPIRATION',
      'BILLING_ISSUE',
      'PRODUCT_CHANGE',
      'NON_RENEWING_PURCHASE',
      'UNCANCELLATION',
    ]
    for (const t of known) {
      expect(() => RevenueCatEventTypeSchema.parse(t)).not.toThrow()
    }
  })

  it('rejects unknown event types', () => {
    expect(() => RevenueCatEventTypeSchema.parse('DEFINITELY_NOT_A_TYPE')).toThrow()
  })
})

describe('RevenueCatWebhookEventSchema', () => {
  it('parses the INITIAL_PURCHASE fixture', () => {
    const parsed = RevenueCatWebhookEventSchema.parse(initialPurchaseFixture)
    expect(parsed.event.type).toBe('INITIAL_PURCHASE')
    expect(parsed.event.app_user_id).toBe('user_123')
  })

  it('parses the BILLING_ISSUE fixture', () => {
    const parsed = RevenueCatWebhookEventSchema.parse(billingIssueFixture)
    expect(parsed.event.type).toBe('BILLING_ISSUE')
  })

  it('rejects payloads missing app_user_id', () => {
    expect(() =>
      RevenueCatWebhookEventSchema.parse({
        event: {
          id: 'evt_1',
          type: 'INITIAL_PURCHASE',
          product_id: 'prod',
          event_timestamp_ms: 1,
        },
      }),
    ).toThrow()
  })
})
