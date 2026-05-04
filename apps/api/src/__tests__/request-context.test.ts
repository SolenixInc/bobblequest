/**
 * Unit tests for createRequestContextMiddleware
 * (apps/api/src/middleware/request-context.ts).
 *
 * Tests:
 *   - requestId is a valid UUID
 *   - logger is set on context (resolved from loggerFactory)
 *   - analytics is set on context (resolved from scoped container)
 *   - X-Request-ID response header is set
 *   - c.get('requestId') matches X-Request-ID
 *   - userId is optionally threaded into scope when present on c.var
 */

import type { AwilixContainer } from '@t/dependency-injection'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequestContextMiddleware } from '../middleware/request-context'

vi.mock('@t/logging', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    requestId: 'test',
    userId: undefined,
  }
  return {
    createGlobalLogger: vi.fn().mockReturnValue(mockLogger),
    GlobalLogger: class {
      error = vi.fn()
      warn = vi.fn()
      warning = vi.fn()
      info = vi.fn()
      debug = vi.fn()
      fatal = vi.fn()
      child = vi.fn().mockReturnThis()
      requestId = 'global'
      userId = undefined
    },
    RequestLogger: class {
      error = vi.fn()
      warn = vi.fn()
      warning = vi.fn()
      info = vi.fn()
      debug = vi.fn()
      fatal = vi.fn()
      child = vi.fn().mockReturnThis()
      requestId = 'request'
      userId = undefined
    },
  }
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function buildMockContainer() {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    requestId: 'test',
    userId: undefined,
  }
  const loggerFactoryFn = vi.fn().mockReturnValue(mockLogger)

  const mockAnalyticsTracker = {
    captureException: vi.fn(),
    capture: vi.fn(),
    shutdown: vi.fn(),
  }

  const mockScope = {
    register: vi.fn(),
    resolve: vi.fn().mockReturnValue(mockAnalyticsTracker),
  }

  const globalAnalytics = { captureException: vi.fn() }

  const mockConfig = { system: { environment: 'testing' } }

  const container = {
    resolve: vi.fn((key: string) => {
      if (key === 'loggerFactory') return loggerFactoryFn
      if (key === 'analytics') return globalAnalytics
      if (key === 'config') return mockConfig
      throw new Error(`Unknown key: ${key}`)
    }),
    createScope: vi.fn().mockReturnValue(mockScope),
  }

  return {
    container,
    mockLogger,
    loggerFactoryFn,
    mockAnalyticsTracker,
    mockScope,
    globalAnalytics,
  }
}

describe('createRequestContextMiddleware', () => {
  let mocks: ReturnType<typeof buildMockContainer>

  beforeEach(() => {
    mocks = buildMockContainer()
  })

  it('sets requestId as a valid UUID v4 on context', async () => {
    const app = new Hono()
    let capturedId: string | undefined
    app.use('*', createRequestContextMiddleware(mocks.container as unknown as AwilixContainer))
    app.get('/test', (c) => {
      capturedId = c.get('requestId' as never) as string
      return c.json({ ok: true })
    })
    await app.request('/test')
    expect(capturedId).toMatch(UUID_REGEX)
  })

  it('sets X-Request-ID header matching context requestId', async () => {
    const app = new Hono()
    let capturedId: string | undefined
    app.use('*', createRequestContextMiddleware(mocks.container as unknown as AwilixContainer))
    app.get('/test', (c) => {
      capturedId = c.get('requestId' as never) as string
      return c.json({ ok: true })
    })
    const res = await app.request('/test')
    expect(res.headers.get('X-Request-ID')).toBe(capturedId)
  })

  it('sets logger on context via loggerFactory resolution', async () => {
    const app = new Hono()
    let loggerSet = false
    app.use('*', createRequestContextMiddleware(mocks.container as unknown as AwilixContainer))
    app.get('/test', (c) => {
      const logger = c.get('logger' as never)
      loggerSet = logger !== undefined && logger !== null
      return c.json({ ok: true })
    })
    await app.request('/test')
    expect(loggerSet).toBe(true)
    expect(mocks.loggerFactoryFn).toHaveBeenCalledOnce()
    const factoryArg = mocks.loggerFactoryFn.mock.calls[0][0] as Record<string, unknown>
    expect(typeof factoryArg.requestId).toBe('string')
    expect(factoryArg.metadata).toMatchObject({ method: 'GET', path: '/test' })
  })

  it('sets analytics on context from scoped container resolution', async () => {
    const app = new Hono()
    let analyticsSet = false
    app.use('*', createRequestContextMiddleware(mocks.container as unknown as AwilixContainer))
    app.get('/test', (c) => {
      const analytics = c.get('analytics' as never)
      analyticsSet = analytics !== undefined && analytics !== null
      return c.json({ ok: true })
    })
    await app.request('/test')
    expect(analyticsSet).toBe(true)
    expect(mocks.container.createScope).toHaveBeenCalledOnce()
    expect(mocks.mockScope.resolve).toHaveBeenCalledWith('requestAnalytics')
  })

  it('registers parent and requestId into the scope', async () => {
    const app = new Hono()
    app.use('*', createRequestContextMiddleware(mocks.container as unknown as AwilixContainer))
    app.get('/test', (c) => c.json({ ok: true }))
    await app.request('/test')

    expect(mocks.mockScope.register).toHaveBeenCalledOnce()
    const registered = mocks.mockScope.register.mock.calls[0][0] as Record<string, unknown>
    expect(registered).toHaveProperty('parent')
    expect(registered).toHaveProperty('requestId')
    expect(registered).toHaveProperty('analytics')
  })

  it('registers userId as undefined in scope when absent from c.var', async () => {
    // Awilix resolves constructor params by name; optional params must always be
    // present in the scope (even as undefined) to avoid AwilixResolutionError.
    const app = new Hono()
    app.use('*', createRequestContextMiddleware(mocks.container as unknown as AwilixContainer))
    app.get('/test', (c) => c.json({ ok: true }))
    await app.request('/test')

    const registered = mocks.mockScope.register.mock.calls[0][0] as Record<string, unknown>
    expect(registered).toHaveProperty('userId')
    // The registered binding wraps undefined — Awilix asValue(undefined) is
    // an object, but resolve() returns undefined at runtime.
  })

  it('registers userId into scope when present on c.var (e.g. from clerkAuth)', async () => {
    const app = new Hono()
    // Simulate clerkAuth setting userId BEFORE request-context runs
    app.use('*', async (c, next) => {
      c.set('userId' as never, 'user_test_123' as never)
      await next()
    })
    app.use('*', createRequestContextMiddleware(mocks.container as unknown as AwilixContainer))
    app.get('/test', (c) => c.json({ ok: true }))
    await app.request('/test')

    const registered = mocks.mockScope.register.mock.calls[0][0] as Record<string, unknown>
    expect(registered).toHaveProperty('userId')
  })

  it('calls next() so downstream handlers execute', async () => {
    const app = new Hono()
    const handlerSpy = vi.fn().mockReturnValue(new Response('ok'))
    app.use('*', createRequestContextMiddleware(mocks.container as unknown as AwilixContainer))
    app.get('/test', handlerSpy)
    await app.request('/test')
    expect(handlerSpy).toHaveBeenCalledOnce()
  })
})
