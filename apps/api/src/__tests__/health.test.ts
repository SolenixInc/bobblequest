import { dependencyKeys } from '@t/dependency-injection'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { describe, expect, it, vi } from 'vitest'

type Pingable = { ping: () => Promise<unknown> }

// We want to test the /health logic in a way that allows us to mock the dependencies.
// Since index.ts is the entrypoint with side effects, we'll test the logic by
// reconstructing the app or mocking the container resolution.

describe('GET /health', () => {
  const mockDb = {
    ping: vi.fn(),
  }
  const mockCache = {
    ping: vi.fn(),
  }
  const mockContainer = {
    resolve: vi.fn((key) => {
      if (key === dependencyKeys.global.DB) return mockDb
      if (key === dependencyKeys.global.CACHE) return mockCache
      return {}
    }),
  }

  // Helper to create a test app with the same logic as index.ts
  const createTestApp = () => {
    const app = new Hono()
    app.get('/health', async (c) => {
      const [dbOk, cacheOk] = await Promise.all([
        (mockContainer.resolve(dependencyKeys.global.DB) as Pingable).ping().catch(() => false),
        (mockContainer.resolve(dependencyKeys.global.CACHE) as Pingable).ping().catch(() => false),
      ])

      const status = dbOk && cacheOk ? 'ok' : 'error'
      const code = dbOk && cacheOk ? 200 : 503

      return c.json(
        {
          status,
          timestamp: new Date().toISOString(),
          details: {
            db: dbOk ? 'ok' : 'error',
            cache: cacheOk ? 'ok' : 'error',
          },
        },
        code as ContentfulStatusCode,
      )
    })
    return app
  }

  it('returns 200 OK when both DB and Cache are healthy', async () => {
    mockDb.ping.mockResolvedValue(true)
    mockCache.ping.mockResolvedValue(true)

    const app = createTestApp()
    const res = await app.request('/health')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      status: 'ok',
      details: {
        db: 'ok',
        cache: 'ok',
      },
    })
  })

  it('returns 503 Service Unavailable when DB is unhealthy', async () => {
    mockDb.ping.mockResolvedValue(false)
    mockCache.ping.mockResolvedValue(true)

    const app = createTestApp()
    const res = await app.request('/health')

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body).toMatchObject({
      status: 'error',
      details: {
        db: 'error',
        cache: 'ok',
      },
    })
  })

  it('returns 503 Service Unavailable when Cache is unhealthy', async () => {
    mockDb.ping.mockResolvedValue(true)
    mockCache.ping.mockResolvedValue(false)

    const app = createTestApp()
    const res = await app.request('/health')

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body).toMatchObject({
      status: 'error',
      details: {
        db: 'ok',
        cache: 'error',
      },
    })
  })

  it('returns 503 Service Unavailable when ping throws', async () => {
    mockDb.ping.mockRejectedValue(new Error('Connection failed'))
    mockCache.ping.mockResolvedValue(true)

    const app = createTestApp()
    const res = await app.request('/health')

    expect(res.status).toBe(503)
    const body = (await res.json()) as { details: { db: string } }
    expect(body.details.db).toBe('error')
  })
})
