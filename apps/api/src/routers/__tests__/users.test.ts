import { describe, expect, test } from 'vitest'
import type { Context, SessionUser } from '../../trpc/context'
import { appRouter } from '../index'

// Minimal mock context for tRPC tests. We only populate the fields the
// exercised procedures actually read; the rest is filled with typed stubs
// so we never need `as any`.
const mockUser: SessionUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user',
}

// Typed stub no-ops for infrastructure fields the 'me' procedure doesn't use.
// Cast to unknown first to avoid implementing full port interfaces in test setup.
const mockContext: Context = {
  userId: mockUser.id,
  user: mockUser,
  req: new Request('http://localhost/trpc'),
  db: null,
  userRepository: {} as Context['userRepository'],
  projectRepository: {} as Context['projectRepository'],
  cache: {} as Context['cache'],
  queue: {} as Context['queue'],
  logger: {} as Context['logger'],
  auth: {} as Context['auth'],
  analytics: {} as Context['analytics'],
  requestAnalytics: {} as Context['requestAnalytics'],
}

describe('Users Router', () => {
  test('me should return context user', async () => {
    // Create a server-side caller for the router
    const caller = appRouter.createCaller(mockContext)

    const result = await caller.users.me()
    expect(result?.id).toBe('test-user-id')
  })
})
