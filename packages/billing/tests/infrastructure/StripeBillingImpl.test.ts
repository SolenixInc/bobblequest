import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StripeBillingImpl } from '../../src/infrastructure/StripeBillingImpl.ts'

function makeFakeStripeClient(): {
  client: Stripe
  create: ReturnType<typeof vi.fn>
} {
  const create = vi.fn().mockResolvedValue({
    url: 'https://checkout.stripe.com/c/pay/test-session',
  })
  const client = {
    checkout: {
      sessions: { create },
    },
    webhooks: {},
  } as unknown as Stripe
  return { client, create }
}

const config = {
  apiKey: 'sk_test_dummy',
  redirectDomain: 'https://app.example.com',
  webhookSecret: 'whsec_test',
}

describe('StripeBillingImpl', () => {
  let clientFake: ReturnType<typeof makeFakeStripeClient>
  let impl: StripeBillingImpl
  let logs: { level: string; payload: unknown }[]

  beforeEach(() => {
    clientFake = makeFakeStripeClient()
    logs = []
    impl = new StripeBillingImpl({
      config,
      stripeClient: clientFake.client,
      logger: {
        debug: (p) => logs.push({ level: 'debug', payload: p }),
        info: (p) => logs.push({ level: 'info', payload: p }),
        warn: (p) => logs.push({ level: 'warn', payload: p }),
        warning: (p) => logs.push({ level: 'warning', payload: p }),
        error: (p) => logs.push({ level: 'error', payload: p }),
      },
    })
  })

  it('createCheckoutSession calls Stripe SDK with correct params', async () => {
    const out = await impl.createCheckoutSession('user_1', 'price_1')
    expect(clientFake.create).toHaveBeenCalledTimes(1)
    const args = clientFake.create.mock.calls[0][0]
    expect(args.mode).toBe('subscription')
    expect(args.line_items).toEqual([{ price: 'price_1', quantity: 1 }])
    expect(args.client_reference_id).toBe('user_1')
    expect(args.success_url).toBe('https://app.example.com/billing/success')
    expect(args.cancel_url).toBe('https://app.example.com/billing/cancel')
    expect(out.url).toContain('checkout.stripe.com')
  })

  it('handleStripeEvent on customer.subscription.created calls syncEntitlement once', async () => {
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)

    const subscriptionEvent = {
      id: 'evt_1',
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
                current_period_start: 1700000000,
                current_period_end: 1702000000,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event

    await impl.handleStripeEvent(subscriptionEvent)
    expect(syncSpy).toHaveBeenCalledTimes(1)
    const [userId, sub, source] = syncSpy.mock.calls[0]
    expect(userId).toBe('user_1')
    expect(source).toBe('stripe')
    expect(sub.status).toBe('active')
    expect(sub.productId).toBe('prod_1')
  })

  it('handleStripeEvent resolves userId from metadata.user_id fallback', async () => {
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_2',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_2',
          status: 'active',
          metadata: { user_id: 'user_via_snake' },
          customer: 'cus_1',
          cancel_at: null,
          items: {
            data: [
              {
                price: { id: 'price_1', product: 'prod_1' },
                current_period_start: 1,
                current_period_end: 2,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy).toHaveBeenCalledOnce()
    expect(syncSpy.mock.calls[0][0]).toBe('user_via_snake')
  })

  it('handleStripeEvent resolves userId from client_reference_id when customer is a string', async () => {
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_3',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_3',
          status: 'active',
          metadata: { client_reference_id: 'user_from_ref' },
          customer: 'cus_string_id',
          cancel_at: null,
          items: {
            data: [
              {
                price: { id: 'price_1', product: 'prod_1' },
                current_period_start: 1,
                current_period_end: 2,
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event
    await impl.handleStripeEvent(event)
    expect(syncSpy).toHaveBeenCalledOnce()
    expect(syncSpy.mock.calls[0][0]).toBe('user_from_ref')
  })

  it('handleStripeEvent logs and skips when no userId can be resolved', async () => {
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    const event = {
      id: 'evt_4',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_4',
          status: 'active',
          metadata: {},
          customer: { id: 'cus_obj' },
          cancel_at: null,
          items: {
            data: [
              {
                price: { id: 'price_1', product: 'prod_1' },
                current_period_start: 1,
                current_period_end: 2,
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

  it('unknown event type is logged and not thrown', async () => {
    const unknownEvent = {
      id: 'evt_unk',
      type: 'some.unknown.event',
      data: { object: {} },
    } as unknown as Stripe.Event

    await expect(impl.handleStripeEvent(unknownEvent)).resolves.toBeUndefined()
    const debugMatch = logs.find(
      (l) =>
        l.level === 'debug' &&
        typeof l.payload === 'object' &&
        l.payload !== null &&
        'metadata' in (l.payload as object),
    )
    expect(debugMatch).toBeDefined()
  })

  it('handleRevenueCatEvent throws wrong-provider error', async () => {
    await expect(
      impl.handleRevenueCatEvent({
        event: {
          id: 'evt',
          type: 'INITIAL_PURCHASE',
          app_user_id: 'u',
          product_id: 'p',
          event_timestamp_ms: 1,
        },
      }),
    ).rejects.toThrow(/wrong provider/)
  })
})
