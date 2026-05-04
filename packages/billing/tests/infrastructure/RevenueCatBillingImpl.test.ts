import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RevenueCatBillingImpl } from '../../src/infrastructure/RevenueCatBillingImpl.ts'

const config = {
  apiKey: 'rc_test_key',
  projectId: 'proj_test',
  nutraforgeEntitlementId: 'ent_test',
}
const WEBHOOK_SECRET = 'shared-secret-abc'

function makeFetchMock(
  responses: Array<{
    status: number
    body?: unknown
  }>,
) {
  const fn = vi.fn(async () => {
    const next = responses.shift()
    if (!next) throw new Error('No more fetch responses queued')
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body ?? {},
    } as unknown as Response
  })
  return fn as unknown as typeof fetch
}

describe('RevenueCatBillingImpl.getEntitlements', () => {
  it('calls the correct URL with a Bearer header and maps entitlements', async () => {
    const httpFetch = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://api.revenuecat.com/v1/subscribers/user_1')
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer rc_test_key')
      return {
        ok: true,
        status: 200,
        json: async () => ({
          subscriber: {
            entitlements: {
              pro: {
                product_identifier: 'nf_pro_monthly',
                expires_date_ms: Date.now() + 86_400_000,
              },
              legacy: {
                product_identifier: 'nf_legacy',
                expires_date_ms: Date.now() - 86_400_000,
              },
              grace_ent: {
                product_identifier: 'nf_grace',
                expires_date_ms: Date.now() + 86_400_000,
                billing_issues_detected_at_ms: Date.now() - 1,
              },
            },
          },
        }),
      } as unknown as Response
    }) as unknown as typeof fetch

    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch,
    })
    const out = await impl.getEntitlements('user_1')
    const statuses = out.map((e) => e.status).sort()
    expect(statuses).toEqual(['active', 'expired', 'grace'])
    for (const e of out) {
      expect(e.source).toBe('revenuecat')
      expect(e.userId).toBe('user_1')
    }
  })

  it('returns empty array on 404', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: makeFetchMock([{ status: 404 }]),
    })
    expect(await impl.getEntitlements('user_unknown')).toEqual([])
  })

  it('throws BillingProviderError on non-2xx non-404 responses', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: makeFetchMock([{ status: 500 }]),
    })
    await expect(impl.getEntitlements('user_1')).rejects.toThrow(/500/)
  })
})

describe('RevenueCatBillingImpl.handleRevenueCatEvent', () => {
  let impl: RevenueCatBillingImpl
  let syncSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: makeFetchMock([]),
    })
    syncSpy = vi.spyOn(impl, 'syncEntitlement').mockResolvedValue(undefined)
  })

  it("BILLING_ISSUE -> syncs with status 'grace'", async () => {
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_1',
        type: 'BILLING_ISSUE',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        expiration_at_ms: Date.now() + 1000,
        event_timestamp_ms: Date.now(),
      },
    })
    expect(syncSpy).toHaveBeenCalledTimes(1)
    const [, sub, source] = syncSpy.mock.calls[0]
    expect(source).toBe('revenuecat')
    expect((sub as { status: string }).status).toBe('grace')
  })

  it("CANCELLATION -> syncs with status 'cancelled'", async () => {
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_2',
        type: 'CANCELLATION',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        event_timestamp_ms: Date.now(),
      },
    })
    const [, sub] = syncSpy.mock.calls[0]
    expect((sub as { status: string }).status).toBe('cancelled')
  })

  it("INITIAL_PURCHASE -> syncs with status 'active'", async () => {
    await impl.handleRevenueCatEvent({
      event: {
        id: 'evt_3',
        type: 'INITIAL_PURCHASE',
        app_user_id: 'user_1',
        product_id: 'prod_1',
        expiration_at_ms: Date.now() + 30_000,
        event_timestamp_ms: Date.now(),
      },
    })
    const [, sub] = syncSpy.mock.calls[0]
    expect((sub as { status: string }).status).toBe('active')
  })
})

describe('RevenueCatBillingImpl surface errors', () => {
  it('createCheckoutSession throws unsupported', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: makeFetchMock([]),
    })
    await expect(impl.createCheckoutSession('u', 'p')).rejects.toThrow(/does not support/i)
  })

  it('handleStripeEvent throws wrong-provider', async () => {
    const impl = new RevenueCatBillingImpl({
      config,
      webhookAuthHeader: WEBHOOK_SECRET,
      httpFetch: makeFetchMock([]),
    })
    await expect(
      impl.handleStripeEvent({ type: 'customer.subscription.created' } as never),
    ).rejects.toThrow(/wrong provider/i)
  })
})
