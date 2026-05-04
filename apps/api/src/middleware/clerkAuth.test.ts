/**
 * Unit tests for the `clerkAuth` Hono middleware.
 *
 * Strategy: build a minimal Hono app with the middleware mounted, drive it
 * via `app.request()`, and assert the context variables surfaced in the
 * downstream route handler. No real DI container or Clerk SDK is involved —
 * all dependencies are hand-rolled stubs.
 */
import type { AuthProvider } from '@t/auth'
import type { AwilixContainer } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type ClerkAuthVariables, type SessionUser, createClerkAuthMiddleware } from './clerkAuth'

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function makeLogger(): Logger {
  return {
    requestId: 'test',
    userId: undefined,
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger
}

function makeAuth(overrides?: Partial<AuthProvider>): AuthProvider {
  return {
    verify: vi.fn(),
    currentUser: vi.fn().mockResolvedValue(null),
    syncFromWebhook: vi.fn(),
    ...overrides,
  } as unknown as AuthProvider
}

function makeContainer(auth: AuthProvider, logger: Logger): AwilixContainer {
  return {
    resolve: vi.fn((token: string) => {
      if (token === dependencyKeys.global.AUTH) return auth
      if (token === dependencyKeys.global.LOGGER) return logger
      throw new Error(`Unexpected token: ${token}`)
    }),
  } as unknown as AwilixContainer
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

type TestApp = Hono<{ Variables: ClerkAuthVariables }>

function buildApp(container: AwilixContainer): TestApp {
  const app = new Hono<{ Variables: ClerkAuthVariables }>()
  app.use('*', createClerkAuthMiddleware(container))
  app.get('/test', (c) =>
    c.json({
      userId: c.var.userId,
      user: c.var.user,
    }),
  )
  return app
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createClerkAuthMiddleware', () => {
  let logger: Logger
  let auth: AuthProvider
  let container: AwilixContainer
  let app: TestApp

  beforeEach(() => {
    logger = makeLogger()
    auth = makeAuth()
    container = makeContainer(auth, logger)
    app = buildApp(container)
  })

  // -------------------------------------------------------------------------
  // Valid Bearer token — happy path
  // -------------------------------------------------------------------------
  describe('valid Bearer token', () => {
    it('sets userId and user on context and calls next()', async () => {
      const mockAuthUser = {
        id: 'user_123',
        email: 'test@example.com',
        role: 'admin',
        firstName: 'Test',
        lastName: 'User',
      }
      vi.mocked(auth.currentUser).mockResolvedValue(mockAuthUser)

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: string | null; user: SessionUser | null }
      expect(body.userId).toBe('user_123')
      expect(body.user).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        role: 'admin',
      })
      expect(auth.currentUser).toHaveBeenCalledWith('valid-token')
    })

    it('maps null role and null email correctly', async () => {
      vi.mocked(auth.currentUser).mockResolvedValue({
        id: 'user_456',
        email: null,
        role: null,
      })

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer another-token' },
      })

      const body = (await res.json()) as { userId: string | null; user: SessionUser | null }
      expect(body.userId).toBe('user_456')
      expect(body.user).toEqual({ id: 'user_456', email: null, role: null })
    })

    it('coerces undefined role/email fields to null', async () => {
      vi.mocked(auth.currentUser).mockResolvedValue({
        id: 'user_789',
        email: null,
        // role omitted → undefined → should be coerced to null
      })

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer token-undef' },
      })

      const body = (await res.json()) as { userId: string | null; user: SessionUser | null }
      expect(body.user?.role).toBe(null)
    })
  })

  // -------------------------------------------------------------------------
  // currentUser returns null (valid JWT but no user record)
  // -------------------------------------------------------------------------
  describe('currentUser returns null', () => {
    it('sets both vars to null and calls next() without error', async () => {
      vi.mocked(auth.currentUser).mockResolvedValue(null)

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer legit-but-no-user' },
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: null; user: null }
      expect(body.userId).toBeNull()
      expect(body.user).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Missing Authorization header
  // -------------------------------------------------------------------------
  describe('missing Authorization header', () => {
    it('sets both vars to null and calls next()', async () => {
      const res = await app.request('/test')

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: null; user: null }
      expect(body.userId).toBeNull()
      expect(body.user).toBeNull()
      expect(auth.currentUser).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Malformed Authorization header (no Bearer prefix)
  // -------------------------------------------------------------------------
  describe('malformed Authorization header', () => {
    it('rejects "Token <value>" scheme: both vars null, next() called', async () => {
      const res = await app.request('/test', {
        headers: { Authorization: 'Token some-api-key' },
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: null; user: null }
      expect(body.userId).toBeNull()
      expect(body.user).toBeNull()
      expect(auth.currentUser).not.toHaveBeenCalled()
    })

    it('rejects "Basic <credentials>" scheme: both vars null, next() called', async () => {
      const res = await app.request('/test', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: null; user: null }
      expect(body.userId).toBeNull()
      expect(body.user).toBeNull()
    })

    it('rejects "Bearer" with no token (whitespace only): both vars null', async () => {
      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer   ' },
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: null; user: null }
      expect(body.userId).toBeNull()
      expect(body.user).toBeNull()
      expect(auth.currentUser).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // currentUser throws (invalid/expired token)
  // -------------------------------------------------------------------------
  describe('invalid token — currentUser throws', () => {
    it('sets both vars to null, logs a warning, and calls next()', async () => {
      vi.mocked(auth.currentUser).mockRejectedValue(new Error('JWT expired'))

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer expired-token' },
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { userId: null; user: null }
      expect(body.userId).toBeNull()
      expect(body.user).toBeNull()
      expect(logger.warning).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'clerkAuth: token verification failed; treating as unauthenticated',
        }),
        '',
      )
    })

    it('does not propagate the thrown error up the stack', async () => {
      vi.mocked(auth.currentUser).mockRejectedValue(new Error('Network failure'))

      await expect(
        app.request('/test', { headers: { Authorization: 'Bearer bad-token' } }),
      ).resolves.toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Container resolution behaviour
  // -------------------------------------------------------------------------
  describe('container resolution', () => {
    it('resolves AUTH and LOGGER tokens from the container on every request', async () => {
      vi.mocked(auth.currentUser).mockResolvedValue({
        id: 'user_res',
        email: null,
        role: null,
      })

      await app.request('/test', { headers: { Authorization: 'Bearer t' } })

      expect(container.resolve).toHaveBeenCalledWith(dependencyKeys.global.AUTH)
      expect(container.resolve).toHaveBeenCalledWith(dependencyKeys.global.LOGGER)
    })
  })
})
