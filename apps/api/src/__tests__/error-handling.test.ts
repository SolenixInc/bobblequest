/**
 * Integration tests: requestContextMiddleware + errorHandler
 *
 * Validates the full middleware pipeline:
 *   - requestId is generated, echoed in X-Request-ID header and response body
 *   - AppError subclasses → correct status + toAppErrorResponse shape
 *   - ZodError → 422 ValidationError shape with field details   (NOTE: errorHandler
 *     converts ZodError → ValidationError which has status 400, not 422; the
 *     actual status code comes from ValidationError.status === 400)
 *   - Generic Error → 500 toUnknownErrorResponse
 *   - Multiple sequential requests each receive a UNIQUE requestId
 *
 * Mocks:
 *   - Container/logger/analytics are minimal doubles so no real DI is needed.
 *   - @t/logging is partially mocked to silence winston in test output.
 */

import type { AwilixContainer } from '@t/dependency-injection'
import { InternalServerError, NotFoundError, errorHandler } from '@t/errors'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createRequestContextMiddleware } from '../middleware/request-context'

// ── Mock @t/logging so no real winston loggers are created ───────────────────
vi.mock('@t/logging', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
    requestId: 'mock-request-id',
    userId: undefined,
  }
  // child() returns itself so chaining works
  mockLogger.child = vi.fn().mockReturnValue(mockLogger)

  const mockLoggerFactory = vi.fn().mockReturnValue(mockLogger)

  return {
    createGlobalLogger: vi.fn().mockReturnValue(mockLogger),
    GlobalLogger: class GlobalLogger {
      error = vi.fn()
      warn = vi.fn()
      warning = vi.fn()
      info = vi.fn()
      debug = vi.fn()
      fatal = vi.fn()
      child = vi.fn().mockReturnValue(this)
      requestId = 'global'
      userId = undefined
    },
    RequestLogger: class RequestLogger {
      error = vi.fn()
      warn = vi.fn()
      warning = vi.fn()
      info = vi.fn()
      debug = vi.fn()
      fatal = vi.fn()
      child = vi.fn().mockReturnValue(this)
      requestId = 'request'
      userId = undefined
    },
    // loggerFactory is the factory fn itself (the registered value is the fn)
    __mockLoggerFactory: mockLoggerFactory,
    __mockLogger: mockLogger,
  }
})

// ── Minimal container double ─────────────────────────────────────────────────
function buildMockContainer() {
  const captureException = vi.fn()
  const mockAnalytics = {
    captureException,
    capture: vi.fn(),
    shutdown: vi.fn(),
  }

  // Minimal tracker that satisfies RequestAnalyticsTrackerImpl constructor
  const mockRequestTracker = {
    captureException: vi.fn(),
    capture: vi.fn(),
    shutdown: vi.fn(),
  }

  const loggerFactoryFn = vi.fn().mockReturnValue({
    error: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    requestId: 'test-request-id',
    userId: undefined,
  })

  const mockScope = {
    register: vi.fn(),
    resolve: vi.fn().mockReturnValue(mockRequestTracker),
  }

  const mockConfig = { system: { environment: 'testing' } }

  const container = {
    resolve: vi.fn((key: string) => {
      if (key === 'loggerFactory') return loggerFactoryFn
      if (key === 'analytics') return mockAnalytics
      if (key === 'config') return mockConfig
      throw new Error(`Unknown key: ${key}`)
    }),
    createScope: vi.fn().mockReturnValue(mockScope),
  }

  return { container, mockAnalytics, mockRequestTracker, loggerFactoryFn, mockScope }
}

// ── App builder ─────────────────────────────────────────────────────────────
function buildTestApp(
  container: ReturnType<typeof buildMockContainer>['container'],
  routes: (app: Hono) => void,
) {
  const app = new Hono()
  app.onError(errorHandler)
  app.use('*', createRequestContextMiddleware(container as unknown as AwilixContainer))
  routes(app)
  return app
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('requestContextMiddleware + errorHandler integration', () => {
  let mocks: ReturnType<typeof buildMockContainer>
  let app: Hono

  beforeEach(() => {
    mocks = buildMockContainer()
  })

  describe('X-Request-ID header', () => {
    it('echoes X-Request-ID on every response', async () => {
      app = buildTestApp(mocks.container, (a) => {
        a.get('/ok', (c) => c.json({ ok: true }))
      })
      const res = await app.request('/ok')
      expect(res.headers.get('X-Request-ID')).toBeTruthy()
      expect(typeof res.headers.get('X-Request-ID')).toBe('string')
    })

    it('X-Request-ID matches requestId in error response body', async () => {
      app = buildTestApp(mocks.container, (a) => {
        a.get('/boom', () => {
          throw new InternalServerError('crash', 'Something went wrong.')
        })
      })
      const res = await app.request('/boom')
      const body = (await res.json()) as Record<string, unknown>
      const header = res.headers.get('X-Request-ID')
      expect(header).toBeTruthy()
      expect(body.requestId).toBe(header)
    })
  })

  describe('AppError → toAppErrorResponse', () => {
    it('returns correct status + JSON for a 4xx AppError', async () => {
      app = buildTestApp(mocks.container, (a) => {
        a.get('/missing', () => {
          throw new NotFoundError('db miss', 'Resource not found.')
        })
      })
      const res = await app.request('/missing')
      expect(res.status).toBe(404)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.success).toBe(false)
      expect(body.name).toBe('Not Found')
      expect(typeof body.requestId).toBe('string')
      expect(body.requestId).toBe(res.headers.get('X-Request-ID'))
    })
  })

  describe('ZodError → ValidationError-shaped 400', () => {
    it('converts a thrown ZodError to 400 with field details', async () => {
      const schema = z.object({ email: z.string().email() })
      app = buildTestApp(mocks.container, (a) => {
        a.get('/validate', () => {
          schema.parse({ email: 'not-an-email' })
          return new Response('ok')
        })
      })
      const res = await app.request('/validate')
      expect(res.status).toBe(400)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.success).toBe(false)
      expect(body.name).toBe('Validation Error')
      // cause contains validationErrors
      const cause = body.cause as Record<string, unknown> | undefined
      expect(cause).toBeDefined()
      expect(Array.isArray((cause as Record<string, unknown>).validationErrors)).toBe(true)
    })
  })

  describe('Generic Error → 500 toUnknownErrorResponse', () => {
    it('returns 500 and unknown error shape for a plain Error', async () => {
      app = buildTestApp(mocks.container, (a) => {
        a.get('/crash', () => {
          throw new Error('something unexpected')
        })
      })
      const res = await app.request('/crash')
      expect(res.status).toBe(500)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.success).toBe(false)
      expect(body.name).toBe('Unknown Error')
      expect(typeof body.requestId).toBe('string')
    })

    it('includes requestId in 500 response body', async () => {
      app = buildTestApp(mocks.container, (a) => {
        a.get('/crash2', () => {
          throw new Error('kaboom')
        })
      })
      const res = await app.request('/crash2')
      const body = (await res.json()) as Record<string, unknown>
      const header = res.headers.get('X-Request-ID')
      expect(body.requestId).toBe(header)
    })
  })

  describe('Unique requestId per request', () => {
    it('generates a distinct requestId for each sequential request', async () => {
      app = buildTestApp(mocks.container, (a) => {
        a.get('/id', (c) => c.json({ ok: true }))
      })
      const res1 = await app.request('/id')
      const res2 = await app.request('/id')
      const res3 = await app.request('/id')

      const id1 = res1.headers.get('X-Request-ID')
      const id2 = res2.headers.get('X-Request-ID')
      const id3 = res3.headers.get('X-Request-ID')

      expect(id1).toBeTruthy()
      expect(id2).toBeTruthy()
      expect(id3).toBeTruthy()
      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })
  })
})
