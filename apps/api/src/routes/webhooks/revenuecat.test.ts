import type { BillingRepository, RevenueCatWebhookEvent } from '@t/billing'
import type { ConfigRepository } from '@t/config'
import type { AwilixContainer } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { createRevenueCatWebhookApp } from './revenuecat'

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const EXPECTED_AUTH = 'test-shared-secret'

const validEvent = {
  event: {
    id: 'evt_001',
    type: 'INITIAL_PURCHASE',
    app_user_id: 'user_abc',
    product_id: 'pro_monthly',
    event_timestamp_ms: 1_700_000_000_000,
  },
  api_version: '1.0',
}

// ---------------------------------------------------------------------------
// Fake container builder
// ---------------------------------------------------------------------------

function buildFakeContainer({
  handleRevenueCatEvent = vi
    .fn<(event: RevenueCatWebhookEvent) => Promise<void>>()
    .mockResolvedValue(undefined),
  webhookAuthHeader = EXPECTED_AUTH,
}: {
  handleRevenueCatEvent?: Mock<(event: RevenueCatWebhookEvent) => Promise<void>>
  webhookAuthHeader?: string
} = {}) {
  const mockLogger: Partial<Logger> = {
    warning: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }

  const mockConfig: Partial<ConfigRepository> = {
    revenueCat: {
      apiKey: 'rc_key',
      projectId: 'proj',
      nutraforgeEntitlementId: 'ent',
      webhookAuthHeader,
    },
  }

  const mockRepo: Partial<BillingRepository> = {
    handleRevenueCatEvent,
  }

  const container = {
    resolve: vi.fn<(token: string) => unknown>((token: string) => {
      if (token === 'billingRepository') return mockRepo
      if (token === 'config') return mockConfig
      if (token === 'logger') return mockLogger
      throw new Error(`Unknown token: ${token}`)
    }),
  } as unknown as AwilixContainer

  return { container, mockRepo, mockConfig, mockLogger, handleRevenueCatEvent }
}

// ---------------------------------------------------------------------------
// Helper: POST with a JSON body
// ---------------------------------------------------------------------------

function post(
  app: ReturnType<typeof createRevenueCatWebhookApp>,
  body: string,
  authHeader?: string,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authHeader !== undefined) {
    headers.Authorization = authHeader
  }
  return app.request('/', { method: 'POST', body, headers })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRevenueCatWebhookApp', () => {
  let handleRevenueCatEvent: Mock<(event: RevenueCatWebhookEvent) => Promise<void>>
  let mockLogger: Partial<Logger>
  let app: ReturnType<typeof createRevenueCatWebhookApp>

  beforeEach(() => {
    const built = buildFakeContainer()
    handleRevenueCatEvent = built.handleRevenueCatEvent
    mockLogger = built.mockLogger
    app = createRevenueCatWebhookApp(built.container)
  })

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('returns 200 and calls handleRevenueCatEvent on valid signature + valid event', async () => {
    const res = await post(app, JSON.stringify(validEvent), EXPECTED_AUTH)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
    expect(handleRevenueCatEvent).toHaveBeenCalledOnce()
    expect(handleRevenueCatEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ id: 'evt_001' }) }),
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('event processed') }),
      '',
    )
  })

  // -------------------------------------------------------------------------
  // Auth failures
  // -------------------------------------------------------------------------

  it('returns 401 and does NOT call handleRevenueCatEvent when Authorization header is wrong', async () => {
    const { container, handleRevenueCatEvent: repoSpy, mockLogger: log } = buildFakeContainer()
    const localApp = createRevenueCatWebhookApp(container)
    const res = await post(localApp, JSON.stringify(validEvent), 'wrong-secret')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ ok: false })
    expect(repoSpy).not.toHaveBeenCalled()
    expect(log.warning).toHaveBeenCalled()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { container, handleRevenueCatEvent: repoSpy, mockLogger: log } = buildFakeContainer()
    const localApp = createRevenueCatWebhookApp(container)
    // post() without third arg omits Authorization header
    const res = await post(localApp, JSON.stringify(validEvent))
    expect(res.status).toBe(401)
    expect(repoSpy).not.toHaveBeenCalled()
    expect(log.warning).toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Parse failures
  // -------------------------------------------------------------------------

  it('returns 400 when body is malformed JSON', async () => {
    const res = await post(app, 'not-valid-json{{{', EXPECTED_AUTH)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ ok: false })
    expect(handleRevenueCatEvent).not.toHaveBeenCalled()
    expect(mockLogger.warning).toHaveBeenCalled()
  })

  it('returns 400 when JSON is valid but schema parse fails (missing required fields)', async () => {
    const badEvent = { event: { type: 'INITIAL_PURCHASE' } } // missing id, app_user_id, etc.
    const res = await post(app, JSON.stringify(badEvent), EXPECTED_AUTH)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ ok: false })
    expect(handleRevenueCatEvent).not.toHaveBeenCalled()
    expect(mockLogger.warning).toHaveBeenCalled()
  })

  it('returns 400 on unknown/unsupported event type', async () => {
    const unknownTypeEvent = {
      event: { ...validEvent.event, type: 'UNKNOWN_EVENT_TYPE' },
    }
    const res = await post(app, JSON.stringify(unknownTypeEvent), EXPECTED_AUTH)
    expect(res.status).toBe(400)
    expect(handleRevenueCatEvent).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Repository error
  // -------------------------------------------------------------------------

  it('returns 500 and logs error when handleRevenueCatEvent throws', async () => {
    const repoError = new Error('DB write failed')
    const { container, mockLogger: log } = buildFakeContainer({
      handleRevenueCatEvent: vi
        .fn<(event: RevenueCatWebhookEvent) => Promise<void>>()
        .mockRejectedValue(repoError),
    })
    const localApp = createRevenueCatWebhookApp(container)
    const res = await post(localApp, JSON.stringify(validEvent), EXPECTED_AUTH)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ ok: false })
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('handleRevenueCatEvent threw') }),
      '',
    )
  })
})
