import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const unsetEnv = (key: string) => delete process.env[key]
import type { AwilixContainer } from '@t/dependency-injection'
import {
  ClerkUserCreatedEventSchema,
  ClerkUserDeletedEventSchema,
  ClerkUserUpdatedEventSchema,
  ClerkWebhookEventSchema,
  createClerkWebhookApp,
  verifyClerkWebhook,
} from '../clerk'

// Allow tests to bypass svix verification by mocking the Webhook class.
// Must use a regular function (not arrow function) because `new Webhook(...)` is called as a constructor.
vi.mock('svix', () => ({
  // biome-ignore lint/complexity/useArrowFunction: constructor mock — arrow functions cannot be used with `new`
  Webhook: vi.fn().mockImplementation(function () {
    return {
      verify: vi.fn().mockImplementation((payload: string) => JSON.parse(payload)),
    }
  }),
}))

// ---------------------------------------------------------------------------
// Stub container factory
// ---------------------------------------------------------------------------

function makeStubContainer(
  overrides: {
    userRepository?: Partial<{
      create: ReturnType<typeof vi.fn>
      findByClerkUserId: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      delete: ReturnType<typeof vi.fn>
    }>
    auth?: Partial<{ syncFromWebhook: ReturnType<typeof vi.fn> }>
    logger?: Partial<{
      info: ReturnType<typeof vi.fn>
      warn: ReturnType<typeof vi.fn>
      error: ReturnType<typeof vi.fn>
    }>
  } = {},
): AwilixContainer {
  const userRepository = {
    create: vi.fn().mockResolvedValue({ id: 'internal_1', clerkUserId: 'user_abc' }),
    findByClerkUserId: vi.fn().mockResolvedValue({ id: 'internal_1', clerkUserId: 'user_abc' }),
    update: vi.fn().mockResolvedValue({ id: 'internal_1', clerkUserId: 'user_abc' }),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides.userRepository,
  }
  const auth = {
    syncFromWebhook: vi.fn().mockResolvedValue(undefined),
    ...overrides.auth,
  }
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    ...overrides.logger,
  }

  const resolveMap: Record<string, unknown> = {
    userRepository,
    auth,
    logger,
  }

  return {
    resolve: vi.fn((key: string) => resolveMap[key]),
  } as unknown as AwilixContainer
}

// Build a minimal Hono test harness. The sub-app is mounted at '/' internally.
async function callWebhook(
  app: ReturnType<typeof createClerkWebhookApp>,
  body: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  const req = new Request('http://localhost/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  })
  return app.fetch(req)
}

const SVIX_HEADERS = {
  'svix-id': 'msg_123',
  'svix-timestamp': '1700000000',
  'svix-signature': 'v1,abc123',
}

describe('verifyClerkWebhook', () => {
  it('calls svix Webhook.verify and returns its result', () => {
    const payload = JSON.stringify({ type: 'user.created', data: { id: 'u1' } })
    const result = verifyClerkWebhook(
      payload,
      { 'svix-id': 'id1', 'svix-timestamp': 'ts1', 'svix-signature': 'sig1' },
      'whsec_test',
    )
    expect(result).toEqual({ type: 'user.created', data: { id: 'u1' } })
  })
})

describe('Clerk webhook schemas', () => {
  it('ClerkUserCreatedEventSchema parses a valid created event', () => {
    const result = ClerkUserCreatedEventSchema.safeParse({
      type: 'user.created',
      data: {
        id: 'user_1',
        email_addresses: [{ id: 'email_1', email_address: 'a@example.com' }],
        primary_email_address_id: 'email_1',
      },
    })
    expect(result.success).toBe(true)
  })

  it('ClerkUserUpdatedEventSchema parses a valid updated event', () => {
    const result = ClerkUserUpdatedEventSchema.safeParse({
      type: 'user.updated',
      data: {
        id: 'user_1',
        email_addresses: [],
      },
    })
    expect(result.success).toBe(true)
  })

  it('ClerkUserDeletedEventSchema parses a valid deleted event', () => {
    const result = ClerkUserDeletedEventSchema.safeParse({
      type: 'user.deleted',
      data: { id: 'user_1', deleted: true },
    })
    expect(result.success).toBe(true)
  })

  it('ClerkWebhookEventSchema rejects unknown event type', () => {
    const result = ClerkWebhookEventSchema.safeParse({
      type: 'session.created',
      data: {},
    })
    expect(result.success).toBe(false)
  })
})

describe('POST /api/webhooks/clerk — missing CLERK_WEBHOOK_SECRET', () => {
  let savedSecret: string | undefined
  let app: ReturnType<typeof createClerkWebhookApp>

  beforeEach(() => {
    savedSecret = process.env.CLERK_WEBHOOK_SECRET
    unsetEnv('CLERK_WEBHOOK_SECRET')
    app = createClerkWebhookApp(makeStubContainer())
  })

  afterEach(() => {
    if (savedSecret !== undefined) {
      process.env.CLERK_WEBHOOK_SECRET = savedSecret
    } else {
      unsetEnv('CLERK_WEBHOOK_SECRET')
    }
  })

  it('returns 500 when CLERK_WEBHOOK_SECRET is not set', async () => {
    const res = await callWebhook(app, '{}', SVIX_HEADERS)
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/not configured/)
  })
})

describe('POST /api/webhooks/clerk — missing svix headers', () => {
  let app: ReturnType<typeof createClerkWebhookApp>

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'
    app = createClerkWebhookApp(makeStubContainer())
  })

  afterEach(() => {
    unsetEnv('CLERK_WEBHOOK_SECRET')
  })

  it('returns 400 when svix-id is missing', async () => {
    const res = await callWebhook(app, '{}', {
      'svix-timestamp': '1700000000',
      'svix-signature': 'v1,abc123',
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/missing svix headers/)
  })

  it('returns 400 when svix-timestamp is missing', async () => {
    const res = await callWebhook(app, '{}', {
      'svix-id': 'msg_1',
      'svix-signature': 'v1,abc123',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when svix-signature is missing', async () => {
    const res = await callWebhook(app, '{}', {
      'svix-id': 'msg_1',
      'svix-timestamp': '1700000000',
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/webhooks/clerk — signature verification failure', () => {
  let app: ReturnType<typeof createClerkWebhookApp>

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'
    app = createClerkWebhookApp(makeStubContainer())
  })

  afterEach(() => {
    unsetEnv('CLERK_WEBHOOK_SECRET')
  })

  it('returns 400 when svix Webhook.verify throws', async () => {
    // Temporarily override the mock so verify throws
    const { Webhook } = await import('svix')
    vi.mocked(Webhook).mockImplementationOnce(
      () =>
        ({
          verify: vi.fn().mockImplementation(() => {
            throw new Error('bad signature')
          }),
        }) as unknown as InstanceType<typeof Webhook>,
    )
    const res = await callWebhook(app, '{}', SVIX_HEADERS)
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/invalid signature/)
  })
})

describe('POST /api/webhooks/clerk — unhandled event type (200 ignored)', () => {
  let app: ReturnType<typeof createClerkWebhookApp>

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'
    app = createClerkWebhookApp(makeStubContainer())
  })

  afterEach(() => {
    unsetEnv('CLERK_WEBHOOK_SECRET')
  })

  it('returns 200 with ignored:true for unrecognized event types', async () => {
    const unknownPayload = JSON.stringify({ type: 'session.created', data: {} })
    const res = await callWebhook(app, unknownPayload, SVIX_HEADERS)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; ignored: boolean }
    expect(body.ok).toBe(true)
    expect(body.ignored).toBe(true)
  })
})

describe('POST /api/webhooks/clerk — user.created event', () => {
  let app: ReturnType<typeof createClerkWebhookApp>

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'
    app = createClerkWebhookApp(makeStubContainer())
  })

  afterEach(() => {
    unsetEnv('CLERK_WEBHOOK_SECRET')
  })

  it('returns 200 for user.created with primary email match', async () => {
    const payload = JSON.stringify({
      type: 'user.created',
      data: {
        id: 'user_abc',
        first_name: 'Alice',
        last_name: 'Smith',
        image_url: 'https://example.com/avatar.png',
        primary_email_address_id: 'email_1',
        email_addresses: [{ id: 'email_1', email_address: 'alice@example.com' }],
      },
    })
    const res = await callWebhook(app, payload, SVIX_HEADERS)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('returns 200 for user.created with no primary_email_address_id (fallback to first)', async () => {
    const payload = JSON.stringify({
      type: 'user.created',
      data: {
        id: 'user_abc',
        first_name: 'Bob',
        last_name: null,
        image_url: null,
        email_addresses: [{ id: 'email_2', email_address: 'bob@example.com' }],
      },
    })
    const res = await callWebhook(app, payload, SVIX_HEADERS)
    expect(res.status).toBe(200)
  })

  it('returns 200 for user.created with no email addresses', async () => {
    const payload = JSON.stringify({
      type: 'user.created',
      data: {
        id: 'user_abc',
        first_name: null,
        last_name: null,
        email_addresses: [],
      },
    })
    const res = await callWebhook(app, payload, SVIX_HEADERS)
    expect(res.status).toBe(200)
  })

  it('returns 200 for user.created with primary_email_address_id that does not match any address', async () => {
    const payload = JSON.stringify({
      type: 'user.created',
      data: {
        id: 'user_abc',
        primary_email_address_id: 'email_nonexistent',
        email_addresses: [{ id: 'email_1', email_address: 'a@example.com' }],
      },
    })
    const res = await callWebhook(app, payload, SVIX_HEADERS)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/webhooks/clerk — user.updated event', () => {
  let app: ReturnType<typeof createClerkWebhookApp>

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'
    app = createClerkWebhookApp(makeStubContainer())
  })

  afterEach(() => {
    unsetEnv('CLERK_WEBHOOK_SECRET')
  })

  it('returns 200 for user.updated', async () => {
    const payload = JSON.stringify({
      type: 'user.updated',
      data: {
        id: 'user_abc',
        first_name: 'Carol',
        last_name: 'Jones',
        image_url: null,
        primary_email_address_id: 'email_1',
        email_addresses: [{ id: 'email_1', email_address: 'carol@example.com' }],
      },
    })
    const res = await callWebhook(app, payload, SVIX_HEADERS)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })
})

describe('POST /api/webhooks/clerk — user.deleted event', () => {
  let app: ReturnType<typeof createClerkWebhookApp>

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'
    app = createClerkWebhookApp(makeStubContainer())
  })

  afterEach(() => {
    unsetEnv('CLERK_WEBHOOK_SECRET')
  })

  it('returns 200 for user.deleted', async () => {
    const payload = JSON.stringify({
      type: 'user.deleted',
      data: { id: 'user_abc', deleted: true },
    })
    const res = await callWebhook(app, payload, SVIX_HEADERS)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })
})
