import { describe, expect, it } from 'vitest'
import { CompositeBillingImpl } from '../../src/infrastructure/CompositeBillingImpl.ts'
import type { RevenueCatBillingImpl } from '../../src/infrastructure/RevenueCatBillingImpl.ts'
import type { StripeBillingImpl } from '../../src/infrastructure/StripeBillingImpl.ts'
import { BillingProviderError } from '../../src/infrastructure/errors.ts'

function makeMock() {
  return {
    createCheckoutSession: async () => ({ url: '' }),
    getEntitlements: async () => [],
    handleStripeEvent: async () => {},
    handleRevenueCatEvent: async () => {},
    syncEntitlement: async () => {},
  }
}

describe('CompositeBillingImpl constructor guards', () => {
  it('throws TypeError when stripe is missing', () => {
    expect(
      () =>
        new CompositeBillingImpl({
          stripe: undefined as never,
          revenuecat: makeMock() as unknown as RevenueCatBillingImpl,
        }),
    ).toThrow(TypeError)
  })

  it('throws TypeError when revenuecat is missing', () => {
    expect(
      () =>
        new CompositeBillingImpl({
          stripe: makeMock() as unknown as StripeBillingImpl,
          revenuecat: undefined as never,
        }),
    ).toThrow(TypeError)
  })
})

describe('CompositeBillingImpl.syncEntitlement exhaustiveness guard', () => {
  it('throws BillingProviderError for unknown source (lines 76-82)', async () => {
    const composite = new CompositeBillingImpl({
      stripe: makeMock() as unknown as StripeBillingImpl,
      revenuecat: makeMock() as unknown as RevenueCatBillingImpl,
    })

    const sub = {
      id: 'sub_1',
      userId: 'u1',
      source: 'unknown-provider' as never,
      status: 'active' as const,
      productId: 'p',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAt: null,
    }

    let thrown: unknown
    try {
      await composite.syncEntitlement('u1', sub, 'unknown-provider' as never)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(BillingProviderError)
  })
})
