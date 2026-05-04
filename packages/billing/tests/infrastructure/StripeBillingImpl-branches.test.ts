import type Stripe from 'stripe'
import { describe, expect, it, vi } from 'vitest'
import { StripeBillingImpl } from '../../src/infrastructure/StripeBillingImpl.ts'
import { BillingProviderError } from '../../src/infrastructure/errors.ts'

const config = {
  apiKey: 'sk_test_dummy',
  redirectDomain: 'https://app.example.com',
  webhookSecret: 'whsec_test',
}

function makeLogger() {
  const logs: { level: string; payload: unknown }[] = []
  return {
    logs,
    logger: {
      debug: (p: unknown) => logs.push({ level: 'debug', payload: p }),
      info: (p: unknown) => logs.push({ level: 'info', payload: p }),
      warn: (p: unknown) => logs.push({ level: 'warn', payload: p }),
      warning: (p: unknown) => logs.push({ level: 'warning', payload: p }),
      error: (p: unknown) => logs.push({ level: 'error', payload: p }),
    },
  }
}

describe('StripeBillingImpl constructor', () => {
  it('uses NOOP_LOGGER when no logger provided', async () => {
    const create = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com' })
    const client = { checkout: { sessions: { create } } } as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    const out = await impl.createCheckoutSession('user_1', 'price_1')
    expect(out.url).toContain('checkout.stripe.com')
  })

  it('throws TypeError when config missing', () => {
    expect(() => new StripeBillingImpl({ config: undefined as never })).toThrow(TypeError)
  })

  it('getClient returns the stripe client', () => {
    const client = { checkout: { sessions: {} } } as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    expect(impl.getClient()).toBe(client)
  })
})

describe('StripeBillingImpl.createCheckoutSession', () => {
  it('throws TypeError when userId is empty', async () => {
    const client = { checkout: { sessions: { create: vi.fn() } } } as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    await expect(impl.createCheckoutSession('', 'price_1')).rejects.toThrow(TypeError)
  })

  it('throws TypeError when priceId is empty', async () => {
    const client = { checkout: { sessions: { create: vi.fn() } } } as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    await expect(impl.createCheckoutSession('user_1', '')).rejects.toThrow(TypeError)
  })

  it('throws BillingProviderError when session.url is null', async () => {
    const create = vi.fn().mockResolvedValue({ url: null })
    const client = { checkout: { sessions: { create } } } as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    await expect(impl.createCheckoutSession('user_1', 'price_1')).rejects.toBeInstanceOf(
      BillingProviderError,
    )
  })
})

describe('StripeBillingImpl.getEntitlements', () => {
  it('always returns empty array', async () => {
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    expect(await impl.getEntitlements('user_1')).toEqual([])
  })
})

describe('StripeBillingImpl.handleStripeEvent — all branches', () => {
  it('invoice.paid logs info', async () => {
    const { logs, logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const event = {
      id: 'evt_inv',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_1',
          customer: 'cus_1',
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(logs.some((l) => l.level === 'info')).toBe(true)
  })

  it('invoice.payment_failed logs warn', async () => {
    const { logs, logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const event = {
      id: 'evt_fail',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_2',
          customer: 'cus_1',
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(logs.some((l) => l.level === 'warn')).toBe(true)
  })

  it('charge.refunded logs warn', async () => {
    const { logs, logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const event = {
      id: 'evt_refund',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_1',
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(logs.some((l) => l.level === 'warn')).toBe(true)
  })

  it('customer.subscription.updated calls syncEntitlement', async () => {
    const { logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_upd',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          metadata: { userId: 'user_1' },
          customer: 'cus_1',
          cancel_at: null,
          items: {
            data: [
              {
                price: { id: 'price_1', product: 'prod_1' },
                current_period_start: 1700000000,
                current_period_end: 1702000000,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy).toHaveBeenCalledTimes(1)
  })

  it('customer.subscription.deleted calls syncEntitlement (canceled status)', async () => {
    const { logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_del',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_1',
          status: 'canceled',
          metadata: { userId: 'user_1' },
          customer: 'cus_1',
          cancel_at: 1700000000,
          items: {
            data: [
              {
                price: { id: 'price_1', product: 'prod_1' },
                current_period_start: 1700000000,
                current_period_end: 1702000000,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy).toHaveBeenCalledTimes(1)
    const sub = syncSpy.mock.calls[0][1]
    expect(sub.status).toBe('cancelled')
    expect(sub.cancelAt).toBeInstanceOf(Date)
  })
})

describe('StripeBillingImpl.normalizeSubscription — userId resolution branches', () => {
  it('uses metadata.user_id when metadata.userId is absent', async () => {
    const { logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_uid',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          metadata: { user_id: 'user_from_user_id' },
          customer: 'cus_1',
          cancel_at: null,
          items: {
            data: [
              {
                price: { id: 'price_1' },
                current_period_start: 1700000000,
                current_period_end: 1702000000,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy.mock.calls[0][0]).toBe('user_from_user_id')
  })

  it("skips sync and logs warn when userId can't be resolved", async () => {
    const { logs, logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_no_uid',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_missing',
          status: 'active',
          metadata: {},
          customer: 'cus_1',
          cancel_at: null,
          items: { data: [] },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy).not.toHaveBeenCalled()
    expect(logs.some((l) => l.level === 'warn')).toBe(true)
  })

  it('falls back to price.id when price.product is absent', async () => {
    const { logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_no_prod',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          metadata: { userId: 'user_1' },
          customer: 'cus_1',
          cancel_at: null,
          items: {
            data: [
              {
                // No product field — falls back to price.id
                price: { id: 'price_fallback_id' },
                current_period_start: 1700000000,
                current_period_end: 1702000000,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy.mock.calls[0][1].productId).toBe('price_fallback_id')
  })

  it('falls back to sub.id when items.data is empty', async () => {
    const { logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_no_items',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_fallback_id',
          status: 'active',
          metadata: { userId: 'user_1' },
          customer: 'cus_1',
          cancel_at: null,
          items: { data: [] },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy.mock.calls[0][1].productId).toBe('sub_fallback_id')
  })

  it('falls back period dates to Date.now-based defaults when periods absent', async () => {
    const { logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    // Math.floor(Date.now() / 1000) * 1000 can be up to 999ms before Date.now()
    const before = Math.floor(Date.now() / 1000) * 1000
    const event = {
      id: 'evt_no_periods',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          metadata: { userId: 'user_1' },
          customer: 'cus_1',
          cancel_at: null,
          items: {
            data: [
              {
                price: { id: 'price_1', product: 'prod_1' },
                // No current_period_start / current_period_end on item
              },
            ],
          },
          // No current_period_start / current_period_end on sub
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    const after = Date.now()
    const sub = syncSpy.mock.calls[0][1]
    expect(sub.currentPeriodStart.getTime()).toBeGreaterThanOrEqual(before)
    expect(sub.currentPeriodStart.getTime()).toBeLessThanOrEqual(after + 2000)
  })
})

describe('StripeBillingImpl.normalizeSubscription — sub.customer as object (line 197 undefined branch)', () => {
  it('falls back to undefined when sub.customer is an object (not a string)', async () => {
    const { logs, logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_obj_customer',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          metadata: {},
          // customer as object (expanded) — typeof !== "string"
          customer: { id: 'cus_1', object: 'customer' },
          cancel_at: null,
          items: {
            data: [
              {
                price: { id: 'price_1', product: 'prod_1' },
                current_period_start: 1700000000,
                current_period_end: 1702000000,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy).not.toHaveBeenCalled()
    expect(logs.some((l) => l.level === 'warn')).toBe(true)
  })
})

describe('StripeBillingImpl.normalizeSubscription — null metadata (line 193 ?? {} branch)', () => {
  it('uses empty object when metadata is null', async () => {
    const { logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_null_meta',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          // metadata is null — triggers the ?? {} fallback
          metadata: null,
          customer: 'cus_1',
          cancel_at: null,
          items: {
            data: [
              {
                price: { id: 'price_1', product: 'prod_1' },
                current_period_start: 1700000000,
                current_period_end: 1702000000,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    // No userId in null metadata → skips sync
    expect(syncSpy).not.toHaveBeenCalled()
  })
})

describe('StripeBillingImpl NOOP_LOGGER path — all logger methods exercised', () => {
  it('invoice.paid with no logger (exercises NOOP_LOGGER info)', async () => {
    const client = {} as unknown as Stripe
    // No logger provided → uses NOOP_LOGGER
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    const event = {
      id: 'evt_inv_noop',
      type: 'invoice.paid',
      data: { object: { id: 'in_1', customer: 'cus_1' } },
    } as unknown as Stripe.Event
    await expect(impl.handleStripeEvent(event)).resolves.toBeUndefined()
  })

  it('invoice.payment_failed with no logger (exercises NOOP_LOGGER warn)', async () => {
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    const event = {
      id: 'evt_fail_noop',
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_2', customer: 'cus_1' } },
    } as unknown as Stripe.Event
    await expect(impl.handleStripeEvent(event)).resolves.toBeUndefined()
  })

  it('charge.refunded with no logger (exercises NOOP_LOGGER warn via charge)', async () => {
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    const event = {
      id: 'evt_refund_noop',
      type: 'charge.refunded',
      data: { object: { id: 'ch_1' } },
    } as unknown as Stripe.Event
    await expect(impl.handleStripeEvent(event)).resolves.toBeUndefined()
  })

  it('unknown event with no logger (exercises NOOP_LOGGER debug)', async () => {
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    const event = {
      id: 'evt_unk_noop',
      type: 'some.unknown.type',
      data: { object: {} },
    } as unknown as Stripe.Event
    await expect(impl.handleStripeEvent(event)).resolves.toBeUndefined()
  })

  it('syncEntitlement with no logger (exercises NOOP_LOGGER debug via syncEntitlement)', async () => {
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    await expect(
      impl.syncEntitlement(
        'u',
        {
          id: 'sub_1',
          userId: 'u',
          source: 'stripe',
          status: 'active',
          productId: 'p',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAt: null,
        },
        'stripe',
      ),
    ).resolves.toBeUndefined()
  })

  it('subscription missing userId with no logger (exercises NOOP_LOGGER warn via normalizeSubscription)', async () => {
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_no_uid_noop',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          metadata: {},
          customer: 'cus_1',
          cancel_at: null,
          items: { data: [] },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy).not.toHaveBeenCalled()
  })
})

describe('StripeBillingImpl.syncEntitlement', () => {
  it('calls logger.debug with subscription details (covers lines 168-185)', async () => {
    const { logs, logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const sub = {
      id: 'sub_direct',
      userId: 'user_1',
      source: 'stripe' as const,
      status: 'active' as const,
      productId: 'prod_1',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAt: null,
    }
    await impl.syncEntitlement('user_1', sub, 'stripe')
    const debugLog = logs.find((l) => l.level === 'debug')
    expect(debugLog).toBeDefined()
    expect(
      (debugLog?.payload as { metadata: { subscriptionId: string } }).metadata.subscriptionId,
    ).toBe('sub_direct')
  })
})

describe('StripeBillingImpl Stripe status mapping', () => {
  async function eventWithStatus(status: string) {
    const { logger } = makeLogger()
    const client = {} as unknown as Stripe
    const impl = new StripeBillingImpl({ config, stripeClient: client, logger })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_status',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status,
          metadata: { userId: 'user_1' },
          customer: 'cus_1',
          cancel_at: null,
          items: {
            data: [
              {
                price: { id: 'price_1', product: 'prod_1' },
                current_period_start: 1700000000,
                current_period_end: 1702000000,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    return syncSpy.mock.calls[0][1].status
  }

  it('trialing -> active', async () => {
    expect(await eventWithStatus('trialing')).toBe('active')
  })

  it('past_due -> grace', async () => {
    expect(await eventWithStatus('past_due')).toBe('grace')
  })

  it('unpaid -> grace', async () => {
    expect(await eventWithStatus('unpaid')).toBe('grace')
  })

  it('incomplete_expired -> cancelled', async () => {
    expect(await eventWithStatus('incomplete_expired')).toBe('cancelled')
  })

  it('incomplete -> expired', async () => {
    expect(await eventWithStatus('incomplete')).toBe('expired')
  })

  it('paused -> expired', async () => {
    expect(await eventWithStatus('paused')).toBe('expired')
  })

  it('unknown status -> expired (default branch)', async () => {
    expect(await eventWithStatus('some_unknown_status')).toBe('expired')
  })
})
