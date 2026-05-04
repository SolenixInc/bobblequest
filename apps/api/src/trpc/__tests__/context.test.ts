import type { Container } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import type { Context as HonoContext } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import { createContext } from '../context'

function makeMockContainer(overrides: Partial<Record<string, unknown>> = {}): Container {
  const defaults: Record<string, unknown> = {
    [dependencyKeys.global.LOGGER]: {
      warning: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    [dependencyKeys.global.AUTH]: {
      currentUser: vi.fn().mockResolvedValue(null),
    },
    [dependencyKeys.global.CACHE]: {},
    [dependencyKeys.global.ANALYTICS]: {},
    [dependencyKeys.global.USER_REPOSITORY]: {},
    [dependencyKeys.global.PROJECT_REPOSITORY]: {},
    [dependencyKeys.global.QUEUE]: {},
    ...overrides,
  }

  return {
    resolve: vi.fn((key: string) => {
      if (key === dependencyKeys.global.DB) throw new Error('DB not registered')
      if (key === dependencyKeys.request.REQUEST_ANALYTICS) throw new Error('not registered')
      if (key in defaults) return defaults[key]
      throw new Error(`Unknown key: ${key}`)
    }),
  } as unknown as Container
}

describe('createContext — no Authorization header', () => {
  it('returns userId=null and user=null when no bearer token present', async () => {
    const container = makeMockContainer()
    const req = new Request('http://localhost/trpc')
    const ctx = await createContext({ req }, container)
    expect(ctx.userId).toBeNull()
    expect(ctx.user).toBeNull()
    expect(ctx.req).toBe(req)
  })

  it('returns userId=null when Authorization header is not a Bearer token', async () => {
    const container = makeMockContainer()
    const req = new Request('http://localhost/trpc', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    })
    const ctx = await createContext({ req }, container)
    expect(ctx.userId).toBeNull()
  })

  it('returns userId=null when Bearer token is empty string', async () => {
    const container = makeMockContainer()
    const req = new Request('http://localhost/trpc', {
      headers: { Authorization: 'Bearer ' },
    })
    const ctx = await createContext({ req }, container)
    expect(ctx.userId).toBeNull()
  })

  it('returns userId=null when Bearer token is whitespace-only (trim to empty)', async () => {
    const container = makeMockContainer()
    const req = new Request('http://localhost/trpc', {
      headers: { Authorization: 'Bearer   ' },
    })
    const ctx = await createContext({ req }, container)
    expect(ctx.userId).toBeNull()
  })
})

describe('createContext — with valid token and auth.currentUser returns a user', () => {
  it('populates userId and user when auth resolves a user', async () => {
    const container = makeMockContainer({
      [dependencyKeys.global.AUTH]: {
        currentUser: vi.fn().mockResolvedValue({
          id: 'user_123',
          role: 'user',
          email: 'a@example.com',
        }),
      },
    })
    const req = new Request('http://localhost/trpc', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const ctx = await createContext({ req }, container)
    expect(ctx.userId).toBe('user_123')
    expect(ctx.user?.id).toBe('user_123')
    expect(ctx.user?.role).toBe('user')
    expect(ctx.user?.email).toBe('a@example.com')
  })

  it('sets role and email to null when auth user has undefined role/email', async () => {
    const container = makeMockContainer({
      [dependencyKeys.global.AUTH]: {
        currentUser: vi.fn().mockResolvedValue({
          id: 'user_456',
          role: undefined,
          email: undefined,
        }),
      },
    })
    const req = new Request('http://localhost/trpc', {
      headers: { Authorization: 'Bearer a-token' },
    })
    const ctx = await createContext({ req }, container)
    expect(ctx.user?.role).toBeNull()
    expect(ctx.user?.email).toBeNull()
  })
})

describe('createContext — with valid token and auth.currentUser returns null', () => {
  it('returns userId=null when auth.currentUser resolves to null', async () => {
    const container = makeMockContainer({
      [dependencyKeys.global.AUTH]: {
        currentUser: vi.fn().mockResolvedValue(null),
      },
    })
    const req = new Request('http://localhost/trpc', {
      headers: { Authorization: 'Bearer some-token' },
    })
    const ctx = await createContext({ req }, container)
    expect(ctx.userId).toBeNull()
    expect(ctx.user).toBeNull()
  })
})

describe('createContext — auth throws (token verification failed)', () => {
  it('returns userId=null and logs warning when auth.currentUser throws', async () => {
    const warnSpy = vi.fn()
    const container = makeMockContainer({
      [dependencyKeys.global.LOGGER]: {
        warning: warnSpy,
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      },
      [dependencyKeys.global.AUTH]: {
        currentUser: vi.fn().mockRejectedValue(new Error('token invalid')),
      },
    })
    const req = new Request('http://localhost/trpc', {
      headers: { Authorization: 'Bearer bad-token' },
    })
    const ctx = await createContext({ req }, container)
    expect(ctx.userId).toBeNull()
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})

describe('createContext — DB not registered (testing env)', () => {
  it('sets db=null when container.resolve(DB) throws', async () => {
    const container = makeMockContainer()
    const req = new Request('http://localhost/trpc')
    const ctx = await createContext({ req }, container)
    expect(ctx.db).toBeNull()
  })
})

describe('createContext — REQUEST_ANALYTICS fallback', () => {
  it('uses global analytics when REQUEST_ANALYTICS is not registered', async () => {
    const globalAnalytics = { capture: vi.fn() }
    const container = makeMockContainer({
      [dependencyKeys.global.ANALYTICS]: globalAnalytics,
    })
    const req = new Request('http://localhost/trpc')
    const ctx = await createContext({ req }, container)
    expect(ctx.requestAnalytics).toBe(globalAnalytics)
  })
})

describe('createContext — Hono context fast path (c provided)', () => {
  it('reads userId and user from c.var when Hono context is provided', async () => {
    const container = makeMockContainer()
    const req = new Request('http://localhost/trpc')
    const mockUser = { id: 'user_hono', role: 'admin', email: 'hono@example.com' }
    // Simulate a Hono context populated by clerkAuth middleware.
    const honoCtx = { var: { userId: 'user_hono', user: mockUser } } as unknown as HonoContext
    const ctx = await createContext({ req }, container, honoCtx)
    expect(ctx.userId).toBe('user_hono')
    expect(ctx.user).toEqual(mockUser)
  })

  it('returns userId=null and user=null when c.var has null auth (unauthenticated request)', async () => {
    const container = makeMockContainer()
    const req = new Request('http://localhost/trpc')
    const honoCtx = { var: { userId: null, user: null } } as unknown as HonoContext
    const ctx = await createContext({ req }, container, honoCtx)
    expect(ctx.userId).toBeNull()
    expect(ctx.user).toBeNull()
  })
})
