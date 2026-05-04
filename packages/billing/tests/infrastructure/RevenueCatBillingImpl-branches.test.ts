import { describe, expect, it, vi } from 'vitest'
import { RevenueCatBillingImpl } from '../../src/infrastructure/RevenueCatBillingImpl.ts'

const config = {
  apiKey: 'rc_test_key',
  projectId: 'proj_test',
  nutraforgeEntitlementId: 'ent_test',
}
const WEBHOOK_SECRET = 'shared-secret-abc'

describe('RevenueCatBillingImpl constructor fallback branches', () => {
  it('uses global fetch when httpFetch not provided (args.httpFetch ?? fetch)', async () => {
    // As long as the constructor succeeds, the ?? fetch branch was exercised.
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      // httpFetch omitted intentionally
    })
    expect(impl).toBeInstanceOf(RevenueCatBillingImpl)
  })

  it('uses NOOP_LOGGER when logger not provided (args.logger ?? NOOP_LOGGER)', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({ subscriber: { entitlements: {} } }),
          }) as unknown as Response,
      ) as unknown as typeof fetch,
      // logger omitted intentionally
    })
    // syncEntitlement uses logger.debug — should not throw when using NOOP_LOGGER
    await impl.syncEntitlement(
      'user_1',
      {
        id: 'sub_1',
        userId: 'user_1',
        source: 'revenuecat',
        status: 'active',
        productId: 'p',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAt: null,
      },
      'revenuecat',
    )
  })

  it('throws TypeError when config is missing', () => {
    expect(
      () =>
        new RevenueCatBillingImpl({
          config: undefined as never,
          webhookAuthHeader: WEBHOOK_SECRET,
        }),
    ).toThrow(TypeError)
  })

  it('throws TypeError when webhookAuthHeader is missing', () => {
    expect(() => new RevenueCatBillingImpl({ config, webhookAuthHeader: '' })).toThrow(TypeError)
  })
})

describe('RevenueCatBillingImpl.getEntitlements — branch coverage', () => {
  it('handles entitlement with unsubscribe_detected_at_ms (cancelled status)', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({
              subscriber: {
                entitlements: {
                  cancelled_ent: {
                    product_identifier: 'nf_cancelled',
                    expires_date_ms: Date.now() + 86_400_000,
                    unsubscribe_detected_at_ms: Date.now() - 1,
                  },
                },
              },
            }),
          }) as unknown as Response,
      ) as unknown as typeof fetch,
    })
    const out = await impl.getEntitlements('user_1')
    expect(out[0].status).toBe('cancelled')
  })

  it('handles entitlement with null expires_date_ms (active, no expiry)', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({
              subscriber: {
                entitlements: {
                  no_expiry: {
                    product_identifier: 'nf_lifetime',
                    expires_date_ms: null,
                  },
                },
              },
            }),
          }) as unknown as Response,
      ) as unknown as typeof fetch,
    })
    const out = await impl.getEntitlements('user_1')
    expect(out[0].status).toBe('active')
    expect(out[0].expiresAt).toBeNull()
  })

  it('throws TypeError when userId is falsy', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn() as unknown as typeof fetch,
    })
    await expect(impl.getEntitlements('')).rejects.toThrow(TypeError)
  })

  it('handles missing subscriber.entitlements (falls back to {} via ??)', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({
              subscriber: {},
            }),
          }) as unknown as Response,
      ) as unknown as typeof fetch,
    })
    const out = await impl.getEntitlements('user_1')
    expect(out).toEqual([])
  })
})

describe('RevenueCatBillingImpl.handleRevenueCatEvent — additional event types', () => {
  it("RENEWAL -> syncs with status 'active'", async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn() as unknown as typeof fetch,
    })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_r',
        type: 'RENEWAL',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        event_timestamp_ms: Date.now(),
      },
    })
    expect(syncSpy.mock.calls[0][1].status).toBe('active')
  })

  it("NON_RENEWING_PURCHASE -> syncs with status 'active'", async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn() as unknown as typeof fetch,
    })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_n',
        type: 'NON_RENEWING_PURCHASE',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        event_timestamp_ms: Date.now(),
      },
    })
    expect(syncSpy.mock.calls[0][1].status).toBe('active')
  })

  it("UNCANCELLATION -> syncs with status 'active'", async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn() as unknown as typeof fetch,
    })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_u',
        type: 'UNCANCELLATION',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        event_timestamp_ms: Date.now(),
      },
    })
    expect(syncSpy.mock.calls[0][1].status).toBe('active')
  })

  it("PRODUCT_CHANGE -> syncs with status 'active'", async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn() as unknown as typeof fetch,
    })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_pc',
        type: 'PRODUCT_CHANGE',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        event_timestamp_ms: Date.now(),
      },
    })
    expect(syncSpy.mock.calls[0][1].status).toBe('active')
  })

  it("EXPIRATION -> syncs with status 'expired'", async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn() as unknown as typeof fetch,
    })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_exp',
        type: 'EXPIRATION',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        event_timestamp_ms: Date.now(),
      },
    })
    expect(syncSpy.mock.calls[0][1].status).toBe('expired')
  })

  it('cancelAt set to now when status is cancelled', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn() as unknown as typeof fetch,
    })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_c',
        type: 'CANCELLATION',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        event_timestamp_ms: Date.now(),
      },
    })
    const sub = syncSpy.mock.calls[0][1]
    expect(sub.cancelAt).toBeInstanceOf(Date)
  })

  it('cancelAt is null when status is not cancelled', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: vi.fn() as unknown as typeof fetch,
    })
    const syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_a',
        type: 'INITIAL_PURCHASE',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        event_timestamp_ms: Date.now(),
      },
    })
    const sub = syncSpy.mock.calls[0][1]
    expect(sub.cancelAt).toBeNull()
  })
})

describe('RevenueCatBillingImpl.getExpectedWebhookAuthHeader', () => {
  it('returns the webhookAuthHeader value', () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: 'my-secret',
      httpFetch: vi.fn() as unknown as typeof fetch,
    })
    expect(impl.getExpectedWebhookAuthHeader()).toBe('my-secret')
  })
})
