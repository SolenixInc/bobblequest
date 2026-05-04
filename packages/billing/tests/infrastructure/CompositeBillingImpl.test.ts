import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompositeBillingImpl } from '../../src/infrastructure/CompositeBillingImpl.ts'
import type { RevenueCatBillingImpl } from '../../src/infrastructure/RevenueCatBillingImpl.ts'
import type { StripeBillingImpl } from '../../src/infrastructure/StripeBillingImpl.ts'

type StripeMock = {
  createCheckoutSession: ReturnType<typeof vi.fn>
  getEntitlements: ReturnType<typeof vi.fn>
  handleStripeEvent: ReturnType<typeof vi.fn>
  handleRevenueCatEvent: ReturnType<typeof vi.fn>
  syncEntitlement: ReturnType<typeof vi.fn>
}

type RCMock = StripeMock

function makeStripeMock(): StripeMock {
  return {
    createCheckoutSession: vi.fn().mockResolvedValue({ url: 'https://stripe' }),
    getEntitlements: vi.fn().mockResolvedValue([
      {
        userId: 'u1',
        productId: 'p_stripe',
        source: 'stripe',
        status: 'active',
        expiresAt: null,
      },
    ]),
    handleStripeEvent: vi.fn().mockResolvedValue(undefined),
    handleRevenueCatEvent: vi.fn().mockRejectedValue(new Error('wrong provider')),
    syncEntitlement: vi.fn().mockResolvedValue(undefined),
  }
}

function makeRCMock(): RCMock {
  return {
    createCheckoutSession: vi.fn().mockRejectedValue(new Error('unsupported')),
    getEntitlements: vi.fn().mockResolvedValue([
      {
        userId: 'u1',
        productId: 'p_rc',
        source: 'revenuecat',
        status: 'active',
        expiresAt: null,
      },
    ]),
    handleStripeEvent: vi.fn().mockRejectedValue(new Error('wrong provider')),
    handleRevenueCatEvent: vi.fn().mockResolvedValue(undefined),
    syncEntitlement: vi.fn().mockResolvedValue(undefined),
  }
}

describe('CompositeBillingImpl', () => {
  let stripe: StripeMock
  let rc: RCMock
  let composite: CompositeBillingImpl

  beforeEach(() => {
    stripe = makeStripeMock()
    rc = makeRCMock()
    composite = new CompositeBillingImpl({
      stripe: stripe as unknown as StripeBillingImpl,
      revenuecat: rc as unknown as RevenueCatBillingImpl,
    })
  })

  it('createCheckoutSession routes to stripe only', async () => {
    const out = await composite.createCheckoutSession('u1', 'price_1')
    expect(out).toEqual({ url: 'https://stripe' })
    expect(stripe.createCheckoutSession).toHaveBeenCalledWith('u1', 'price_1')
    expect(rc.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('getEntitlements merges arrays from both impls', async () => {
    const result = await composite.getEntitlements('u1')
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.source).sort()).toEqual(['revenuecat', 'stripe'])
    expect(stripe.getEntitlements).toHaveBeenCalledWith('u1')
    expect(rc.getEntitlements).toHaveBeenCalledWith('u1')
  })

  it('handleStripeEvent routes to stripe only', async () => {
    const fakeEvent = { id: 'evt', type: 'customer.subscription.created' }
    await composite.handleStripeEvent(fakeEvent as never)
    expect(stripe.handleStripeEvent).toHaveBeenCalledWith(fakeEvent)
    expect(rc.handleStripeEvent).not.toHaveBeenCalled()
  })

  it('handleRevenueCatEvent routes to rc only', async () => {
    const fakeEvent = {
      event: {
        id: 'evt',
        type: 'INITIAL_PURCHASE',
        app_user_id: 'u',
        product_id: 'p',
        event_timestamp_ms: 1,
      },
    }
    await composite.handleRevenueCatEvent(fakeEvent as never)
    expect(rc.handleRevenueCatEvent).toHaveBeenCalledWith(fakeEvent)
    expect(stripe.handleRevenueCatEvent).not.toHaveBeenCalled()
  })

  it('syncEntitlement routes by source', async () => {
    const sub = {
      id: 'sub_1',
      userId: 'u1',
      source: 'stripe' as const,
      status: 'active' as const,
      productId: 'p',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAt: null,
    }

    await composite.syncEntitlement('u1', sub, 'stripe')
    expect(stripe.syncEntitlement).toHaveBeenCalledTimes(1)
    expect(rc.syncEntitlement).toHaveBeenCalledTimes(0)

    await composite.syncEntitlement('u1', { ...sub, source: 'revenuecat' }, 'revenuecat')
    expect(rc.syncEntitlement).toHaveBeenCalledTimes(1)
    expect(stripe.syncEntitlement).toHaveBeenCalledTimes(1)
  })
})
