import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { errorHandler } from '../../delivery/errorHandler.ts'
import { NotFoundError } from '../../infrastructure/4xx/NotFoundError.ts'
import { UnauthorizedError } from '../../infrastructure/4xx/UnauthorizedError.ts'
import { ValidationError } from '../../infrastructure/4xx/ValidationError.ts'
import { InternalServerError } from '../../infrastructure/5xx/InternalServerError.ts'

// Suppress logger output during tests
vi.mock('@t/logging', () => ({
  createGlobalLogger: () => ({
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
  RequestLogger: class RequestLogger {
    error = vi.fn()
    warning = vi.fn()
    info = vi.fn()
  },
}))

function buildApp(throwFn: () => never) {
  const app = new Hono()
  app.onError(errorHandler)
  app.get('/test', () => {
    throw throwFn()
  })
  return app
}

async function hit(app: Hono) {
  return app.request('/test', { method: 'GET' })
}

describe('errorHandler', () => {
  describe('AppError subclasses', () => {
    it('returns 404 for NotFoundError', async () => {
      const app = buildApp(() => {
        throw new NotFoundError('db miss', 'Resource not found.')
      })
      const res = await hit(app)
      expect(res.status).toBe(404)
    })

    it('returns JSON body with success: false for NotFoundError', async () => {
      const app = buildApp(() => {
        throw new NotFoundError('db miss', 'Resource not found.')
      })
      const res = await hit(app)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.success).toBe(false)
      expect(body.name).toBe('Not Found')
      expect(body.status).toBe(404)
    })

    it('returns 401 for UnauthorizedError', async () => {
      const app = buildApp(() => {
        throw new UnauthorizedError('no token', 'Login required.')
      })
      const res = await hit(app)
      expect(res.status).toBe(401)
    })

    it('returns 500 for InternalServerError', async () => {
      const app = buildApp(() => {
        throw new InternalServerError('crash', 'Something went wrong.')
      })
      const res = await hit(app)
      expect(res.status).toBe(500)
    })

    it('returns 400 for ValidationError', async () => {
      const app = buildApp(() => {
        throw new ValidationError('invalid input', 'Check your input.')
      })
      const res = await hit(app)
      expect(res.status).toBe(400)
    })
  })

  describe('ZodError auto-conversion', () => {
    it('converts ZodError to 400 ValidationError response', async () => {
      const schema = z.object({ email: z.string().email() })
      const app = new Hono()
      app.onError(errorHandler)
      app.get('/test', () => {
        schema.parse({ email: 'not-valid' })
        return new Response('ok')
      })
      const res = await app.request('/test')
      expect(res.status).toBe(400)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.name).toBe('Validation Error')
    })
  })

  describe('unknown errors', () => {
    it('returns 500 for a plain Error', async () => {
      const app = buildApp(() => {
        throw new Error('something unexpected')
      })
      const res = await hit(app)
      expect(res.status).toBe(500)
    })

    it('returns JSON with success: false for unknown errors', async () => {
      const app = buildApp(() => {
        throw new Error('mystery')
      })
      const res = await hit(app)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.success).toBe(false)
      expect(body.name).toBe('Unknown Error')
    })

    it('sanitizes HTML from unknown error messages', async () => {
      const app = buildApp(() => {
        throw new Error('<html><body>GCS error page</body></html>')
      })
      const res = await hit(app)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.message).not.toContain('<html>')
    })
  })

  describe('content-type', () => {
    it('sets Content-Type: application/json', async () => {
      const app = buildApp(() => {
        throw new NotFoundError('miss', 'Not found.')
      })
      const res = await hit(app)
      expect(res.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('context variable: requestId', () => {
    it('includes requestId in the response body when set on context', async () => {
      const app = new Hono()
      app.onError(errorHandler)
      app.use(async (c, next) => {
        c.set('requestId' as never, 'req-test-123')
        await next()
      })
      app.get('/test', () => {
        throw new NotFoundError('miss', 'Not found.')
      })
      const res = await app.request('/test')
      const body = (await res.json()) as Record<string, unknown>
      expect(body.requestId).toBe('req-test-123')
    })

    it('response body has no requestId field when absent from context', async () => {
      const app = buildApp(() => {
        throw new NotFoundError('miss', 'Not found.')
      })
      const res = await hit(app)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.requestId).toBeUndefined()
    })

    it('passes requestId through to unknown error response', async () => {
      const app = new Hono()
      app.onError(errorHandler)
      app.use(async (c, next) => {
        c.set('requestId' as never, 'req-unknown-456')
        await next()
      })
      app.get('/test', () => {
        throw new Error('boom')
      })
      const res = await app.request('/test')
      const body = (await res.json()) as Record<string, unknown>
      expect(body.requestId).toBe('req-unknown-456')
    })
  })

  describe('context variable: logger', () => {
    it('uses the context logger instead of the global fallback when set', async () => {
      const mockLogger = {
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
      }

      const app = new Hono()
      app.onError(errorHandler)
      app.use(async (c, next) => {
        c.set('logger' as never, mockLogger as never)
        await next()
      })
      app.get('/test', () => {
        throw new NotFoundError('miss', 'Not found.')
      })

      await app.request('/test')
      // 404 is a warning-level log — but since mockLogger is not a RequestLogger
      // instance, it falls through to the else branch (error call)
      expect(mockLogger.error).toHaveBeenCalledOnce()
    })

    it('uses the context RequestLogger with appropriate level for 4xx (warning)', async () => {
      const { RequestLogger } = await import('@t/logging')
      const mockRequestLogger = new RequestLogger({ requestId: 'test' })

      const app = new Hono()
      app.onError(errorHandler)
      app.use(async (c, next) => {
        c.set('logger' as never, mockRequestLogger as never)
        await next()
      })
      app.get('/test', () => {
        throw new NotFoundError('miss', 'Not found.')
      })

      await app.request('/test')
      expect(mockRequestLogger.warning).toHaveBeenCalledOnce()
    })

    it('uses the context RequestLogger with error level for 5xx', async () => {
      const { RequestLogger } = await import('@t/logging')
      const mockRequestLogger = new RequestLogger({ requestId: 'test' })

      const app = new Hono()
      app.onError(errorHandler)
      app.use(async (c, next) => {
        c.set('logger' as never, mockRequestLogger as never)
        await next()
      })
      app.get('/test', () => {
        throw new InternalServerError('crash', 'Something went wrong.')
      })

      await app.request('/test')
      expect(mockRequestLogger.error).toHaveBeenCalledOnce()
    })
  })

  describe('context variable: analytics', () => {
    it('calls captureException when analytics is set and error is 5xx', async () => {
      const mockAnalytics = { captureException: vi.fn() }

      const app = new Hono()
      app.onError(errorHandler)
      app.use(async (c, next) => {
        c.set('analytics' as never, mockAnalytics as never)
        await next()
      })
      app.get('/test', () => {
        throw new InternalServerError('crash', 'Something went wrong.')
      })

      await app.request('/test')
      expect(mockAnalytics.captureException).toHaveBeenCalledOnce()
      const [capturedError, capturedCtx] = mockAnalytics.captureException.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
      ]
      expect(capturedError).toBeInstanceOf(InternalServerError)
      expect(capturedCtx).toMatchObject({ statusCode: 500 })
    })

    it('does NOT call captureException when analytics is set but error is 4xx', async () => {
      const mockAnalytics = { captureException: vi.fn() }

      const app = new Hono()
      app.onError(errorHandler)
      app.use(async (c, next) => {
        c.set('analytics' as never, mockAnalytics as never)
        await next()
      })
      app.get('/test', () => {
        throw new NotFoundError('miss', 'Not found.')
      })

      await app.request('/test')
      expect(mockAnalytics.captureException).not.toHaveBeenCalled()
    })

    it('does NOT call captureException when analytics is absent', async () => {
      // No analytics set — should not throw and should complete normally
      const app = buildApp(() => {
        throw new InternalServerError('crash', 'Something went wrong.')
      })
      const res = await hit(app)
      expect(res.status).toBe(500)
    })

    it('passes requestId into captureException context when both are set', async () => {
      const mockAnalytics = { captureException: vi.fn() }

      const app = new Hono()
      app.onError(errorHandler)
      app.use(async (c, next) => {
        c.set('requestId' as never, 'req-analytics-789')
        c.set('analytics' as never, mockAnalytics as never)
        await next()
      })
      app.get('/test', () => {
        throw new InternalServerError('crash', 'Something went wrong.')
      })

      await app.request('/test')
      expect(mockAnalytics.captureException).toHaveBeenCalledOnce()
      const [, capturedCtx] = mockAnalytics.captureException.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
      ]
      expect(capturedCtx).toMatchObject({ requestId: 'req-analytics-789' })
    })

    it('calls captureException for unknown 500 errors too', async () => {
      const mockAnalytics = { captureException: vi.fn() }

      const app = new Hono()
      app.onError(errorHandler)
      app.use(async (c, next) => {
        c.set('analytics' as never, mockAnalytics as never)
        await next()
      })
      app.get('/test', () => {
        throw new Error('unexpected')
      })

      await app.request('/test')
      expect(mockAnalytics.captureException).toHaveBeenCalledOnce()
    })
  })
})
