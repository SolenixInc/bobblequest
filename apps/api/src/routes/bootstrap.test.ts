import type { DbClient } from '@t/db'
import type { AwilixContainer } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { createBootstrapApp } from './bootstrap'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockContainer = {
  resolve: Mock<(token: string) => unknown>
}

function buildMockDb(overrides?: Partial<DbClient>): DbClient {
  return {
    ping: vi.fn().mockResolvedValue(true),
    transaction: vi.fn(),
    close: vi.fn(),
    raw: vi.fn(),
    ...overrides,
  } as unknown as DbClient
}

function buildFakeContainer(
  overrides: { db?: DbClient; tokenOverrides?: Record<string, unknown> } = {},
): MockContainer {
  const db = overrides.db ?? buildMockDb()

  const container: MockContainer = {
    resolve: vi.fn<(token: string) => unknown>((token: string) => {
      if (token === dependencyKeys.global.DB) return db
      if (overrides.tokenOverrides && token in overrides.tokenOverrides) {
        return overrides.tokenOverrides[token]
      }
      // Return a stub object for every other DI token so the probe can list them
      return {}
    }),
  }
  return container
}

async function get(app: ReturnType<typeof createBootstrapApp>): Promise<Response> {
  return await app.request('/', { method: 'GET' })
}

async function getJson(
  app: ReturnType<typeof createBootstrapApp>,
): Promise<Record<string, unknown>> {
  const res = await get(app)
  return (await res.json()) as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createBootstrapApp', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset env to a known baseline
    for (const key of Object.keys(process.env)) {
      delete process.env[key]
    }
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
  })

  // -------------------------------------------------------------------------
  // Basic shape
  // -------------------------------------------------------------------------

  it('returns HTTP 200 always', async () => {
    const app = createBootstrapApp(buildFakeContainer() as unknown as AwilixContainer)
    const res = await get(app)
    expect(res.status).toBe(200)
  })

  it('returns the expected top-level fields', async () => {
    const app = createBootstrapApp(buildFakeContainer() as unknown as AwilixContainer)
    const body = await getJson(app)
    expect(body).toMatchObject({
      app: 'api',
      version: expect.any(String),
      uptime: expect.any(Number),
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      env: expect.any(Object),
      di: { tokens: expect.any(Array), failed: expect.any(Array) },
    })
    expect(typeof body.db === 'string' || typeof body.db === 'object').toBe(true)
  })

  // -------------------------------------------------------------------------
  // Env presence reporting — NEVER values
  // -------------------------------------------------------------------------

  it('reports "set" for env vars that are present', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_secret_value_must_not_appear_in_output'
    process.env.DATABASE_URL = 'postgres://localhost/db'

    const app = createBootstrapApp(buildFakeContainer() as unknown as AwilixContainer)
    const body = await getJson(app)

    const env = body.env as Record<string, string>
    expect(env.CLERK_SECRET_KEY).toBe('set')
    expect(env.DATABASE_URL).toBe('set')
  })

  it('reports "missing" for env vars that are absent', async () => {
    // process.env wiped in beforeEach — all vars absent
    const app = createBootstrapApp(buildFakeContainer() as unknown as AwilixContainer)
    const body = await getJson(app)

    const env = body.env as Record<string, string>
    expect(env.CLERK_SECRET_KEY).toBe('missing')
    expect(env.DATABASE_URL).toBe('missing')
    expect(env.STRIPE_KEY).toBe('missing')
  })

  it('NEVER emits actual env var values', async () => {
    process.env.CLERK_SECRET_KEY = 'super_secret_that_must_never_leak'
    const app = createBootstrapApp(buildFakeContainer() as unknown as AwilixContainer)
    const res = await get(app)
    const raw = await res.text()

    expect(raw).not.toContain('super_secret_that_must_never_leak')
  })

  // -------------------------------------------------------------------------
  // DI introspection
  // -------------------------------------------------------------------------

  it('lists successfully resolved DI tokens in di.tokens', async () => {
    const app = createBootstrapApp(buildFakeContainer() as unknown as AwilixContainer)
    const body = await getJson(app)

    const di = body.di as { tokens: string[]; failed: string[] }
    const globalTokens = Object.values(dependencyKeys.global)
    for (const token of globalTokens) {
      expect(di.tokens).toContain(token)
    }
    expect(di.failed).toHaveLength(0)
  })

  it('moves a token to di.failed when resolution throws', async () => {
    const container = buildFakeContainer() as unknown as AwilixContainer
    // Override resolve to throw for ANALYTICS
    const originalResolve = (container as unknown as MockContainer).resolve
    ;(container as unknown as MockContainer).resolve = vi.fn<(token: string) => unknown>(
      (token: string) => {
        if (token === dependencyKeys.global.ANALYTICS) {
          throw new Error('Registration missing')
        }
        return originalResolve(token)
      },
    )

    const app = createBootstrapApp(container)
    const body = await getJson(app)
    const di = body.di as { tokens: string[]; failed: string[] }

    expect(di.failed).toContain(dependencyKeys.global.ANALYTICS)
    expect(di.tokens).not.toContain(dependencyKeys.global.ANALYTICS)
  })

  // -------------------------------------------------------------------------
  // DB ping — ok branch
  // -------------------------------------------------------------------------

  it('returns db: "ok" when ping resolves', async () => {
    const app = createBootstrapApp(buildFakeContainer() as unknown as AwilixContainer)
    const body = await getJson(app)
    expect(body.db).toBe('ok')
  })

  // -------------------------------------------------------------------------
  // DB ping — error branch (still 200)
  // -------------------------------------------------------------------------

  it('returns db: { error } and still HTTP 200 when ping throws', async () => {
    const mockDb = buildMockDb({
      ping: vi.fn().mockRejectedValue(new Error('connection refused')),
    })
    const app = createBootstrapApp(buildFakeContainer({ db: mockDb }) as unknown as AwilixContainer)
    const res = await get(app)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.db).toEqual({ error: expect.stringContaining('connection refused') })
  })

  it('returns db: { error } and still HTTP 200 when DB token is not registered', async () => {
    const container: MockContainer = {
      resolve: vi.fn<(token: string) => unknown>((token: string) => {
        if (token === dependencyKeys.global.DB) throw new Error('DB not registered')
        return {}
      }),
    }
    const app = createBootstrapApp(container as unknown as AwilixContainer)
    const res = await get(app)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.db).toEqual({ error: expect.any(String) })
  })

  it('truncates very long db error messages to 120 chars', async () => {
    const longMessage = 'x'.repeat(300)
    const mockDb = buildMockDb({
      ping: vi.fn().mockRejectedValue(new Error(longMessage)),
    })
    const app = createBootstrapApp(buildFakeContainer({ db: mockDb }) as unknown as AwilixContainer)
    const body = await getJson(app)
    const db = body.db as { error: string }
    expect(db.error.length).toBeLessThanOrEqual(120)
  })

  it('converts non-Error thrown value to string in db error', async () => {
    const mockDb = buildMockDb({
      ping: vi.fn().mockRejectedValue('plain string error'),
    })
    const app = createBootstrapApp(buildFakeContainer({ db: mockDb }) as unknown as AwilixContainer)
    const body = await getJson(app)
    expect(body.db).toEqual({ error: 'plain string error' })
  })
})
