import { describe, expect, test, vi } from 'vitest'
import type { WebhookEvent } from '../../src/entities/schemas/WebhookEventSchema.ts'
import { AuthError } from '../../src/entities/types/AuthError.ts'
import { ClerkAuthProvider } from '../../src/infrastructure/clerk/ClerkAuthProvider.ts'

// ── helpers ──────────────────────────────────────────────────────────────

type FakeClerkUser = {
  id: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  primaryEmailAddressId: string | null
  emailAddresses: Array<{ id: string; emailAddress: string }>
  publicMetadata: Record<string, unknown>
}

function makeClerkUser(overrides: Partial<FakeClerkUser> = {}): FakeClerkUser {
  return {
    id: 'user_123',
    firstName: 'Alice',
    lastName: 'Doe',
    imageUrl: 'https://img.clerk.com/alice.png',
    primaryEmailAddressId: 'email_1',
    emailAddresses: [{ id: 'email_1', emailAddress: 'alice@example.com' }],
    publicMetadata: {},
    ...overrides,
  }
}

function makeProvider(
  options: {
    user?: FakeClerkUser
    verifyImpl?: (token: string, opts: unknown) => Promise<unknown>
    getUserImpl?: (id: string) => Promise<FakeClerkUser>
    authorizedParties?: readonly string[]
    userSync?: (event: WebhookEvent) => Promise<void>
  } = {},
) {
  const user = options.user ?? makeClerkUser()
  const getUserSpy = vi.fn(options.getUserImpl ?? (async (id: string) => ({ ...user, id })))
  const tokenVerifier = vi.fn(
    options.verifyImpl ??
      (async () => ({
        sub: user.id,
        sid: 'sess_1',
        iat: 1_700_000_000,
        exp: 1_700_003_600,
        iss: 'https://test.clerk.com',
      })),
  )
  const clerkClientFactory = vi.fn(() => ({
    users: { getUser: getUserSpy },
  }))

  const provider = new ClerkAuthProvider({
    clerkSecretKey: 'sk_test_abc',
    clerkPublishableKey: 'pk_test_abc',
    authorizedParties: options.authorizedParties,
    userSync: options.userSync,
    // Test narrowing: factory return only needs the `users.getUser` surface
    // that this impl actually consumes.
    clerkClientFactory: clerkClientFactory as never,
    tokenVerifier: tokenVerifier as never,
  })

  return { provider, tokenVerifier, getUserSpy, clerkClientFactory }
}

// ── verify happy path ───────────────────────────────────────────────────

describe('ClerkAuthProvider.verify — happy path', () => {
  test('returns AuthUser projection from verified claims + Clerk user', async () => {
    const { provider } = makeProvider()
    const user = await provider.verify('token')
    expect(user.id).toBe('user_123')
    expect(user.email).toBe('alice@example.com')
    expect(user.firstName).toBe('Alice')
  })

  test('surfaces role from publicMetadata.role when a string', async () => {
    const { provider } = makeProvider({
      user: makeClerkUser({ publicMetadata: { role: 'admin' } }),
    })
    const user = await provider.verify('token')
    expect(user.role).toBe('admin')
  })

  test('role is null when publicMetadata.role is non-string', async () => {
    const { provider } = makeProvider({
      user: makeClerkUser({ publicMetadata: { role: 42 as unknown as string } }),
    })
    const user = await provider.verify('token')
    expect(user.role).toBeNull()
  })

  test('forwards authorizedParties to verifyToken', async () => {
    const { provider, tokenVerifier } = makeProvider({
      authorizedParties: ['https://web.example.com', 'https://api.example.com'],
    })
    await provider.verify('token')
    const call = (tokenVerifier as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call?.[0]).toBe('token')
    expect((call?.[1] as { authorizedParties?: string[] }).authorizedParties).toEqual([
      'https://web.example.com',
      'https://api.example.com',
    ])
  })
})

// ── verify error mapping ────────────────────────────────────────────────

describe('ClerkAuthProvider.verify — error mapping', () => {
  test('TOKEN_MISSING when token is empty', async () => {
    const { provider } = makeProvider()
    await expect(provider.verify('')).rejects.toMatchObject({
      name: 'AuthError',
      code: 'TOKEN_MISSING',
    })
  })

  test("TOKEN_EXPIRED when verifier throws with 'expired' message", async () => {
    const { provider } = makeProvider({
      verifyImpl: async () => {
        throw new Error('Token expired')
      },
    })
    await expect(provider.verify('t')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' })
  })

  test("TOKEN_TAMPERED when verifier throws with 'signature' message", async () => {
    const { provider } = makeProvider({
      verifyImpl: async () => {
        throw new Error('Invalid signature on JWT')
      },
    })
    await expect(provider.verify('t')).rejects.toMatchObject({ code: 'TOKEN_TAMPERED' })
  })

  test("UNAUTHORIZED_PARTY when verifier throws with 'authorized' message", async () => {
    const { provider } = makeProvider({
      verifyImpl: async () => {
        throw new Error('Not an authorized party')
      },
    })
    await expect(provider.verify('t')).rejects.toMatchObject({ code: 'UNAUTHORIZED_PARTY' })
  })

  test('TOKEN_INVALID when verifier throws generic error', async () => {
    const { provider } = makeProvider({
      verifyImpl: async () => {
        throw new Error('boom')
      },
    })
    await expect(provider.verify('t')).rejects.toMatchObject({ code: 'TOKEN_INVALID' })
  })

  test('TOKEN_INVALID when claims fail schema validation', async () => {
    const { provider } = makeProvider({
      verifyImpl: async () => ({ sub: '' as unknown as string }),
    })
    await expect(provider.verify('t')).rejects.toMatchObject({ code: 'TOKEN_INVALID' })
  })

  test('USER_NOT_FOUND when Clerk user lookup throws', async () => {
    const { provider } = makeProvider({
      getUserImpl: async () => {
        throw new Error('Clerk 404')
      },
    })
    await expect(provider.verify('t')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    })
  })
})

// ── currentUser ─────────────────────────────────────────────────────────

describe('ClerkAuthProvider.currentUser', () => {
  test('returns null for null / undefined / empty token (no verify call)', async () => {
    const { provider, tokenVerifier } = makeProvider()
    expect(await provider.currentUser(null)).toBeNull()
    expect(await provider.currentUser(undefined)).toBeNull()
    expect(await provider.currentUser('')).toBeNull()
    expect(tokenVerifier).not.toHaveBeenCalled()
  })

  test('returns AuthUser on success', async () => {
    const { provider } = makeProvider()
    const user = await provider.currentUser('token')
    expect(user?.id).toBe('user_123')
  })

  test('swallows AuthError and returns null', async () => {
    const { provider } = makeProvider({
      verifyImpl: async () => {
        throw new Error('Token expired')
      },
    })
    expect(await provider.currentUser('t')).toBeNull()
  })

  test('wrapped verify errors become AuthError and are swallowed', async () => {
    // Even a weird non-JWT error from the verifier is mapped to AuthError
    // via wrapVerifyError, so currentUser still returns null.
    const { provider } = makeProvider({
      verifyImpl: async () => {
        throw Object.assign(new Error('weird'), { name: 'SomethingElse' })
      },
    })
    expect(await provider.currentUser('t')).toBeNull()
  })
})

// ── syncFromWebhook ─────────────────────────────────────────────────────

describe('ClerkAuthProvider.syncFromWebhook', () => {
  test('invokes userSync with the event when configured', async () => {
    const userSync = vi.fn(async () => {})
    const { provider } = makeProvider({ userSync })
    const event: WebhookEvent = {
      type: 'user.created',
      data: {
        id: 'user_new',
        email_addresses: [{ id: 'e1', email_address: 'new@example.com' }],
      },
    } as WebhookEvent
    await provider.syncFromWebhook(event)
    expect(userSync).toHaveBeenCalledWith(event)
  })

  test('is a no-op when no userSync is configured', async () => {
    const { provider } = makeProvider()
    const event: WebhookEvent = {
      type: 'user.deleted',
      data: { id: 'user_del' },
    } as WebhookEvent
    await expect(provider.syncFromWebhook(event)).resolves.toBeUndefined()
  })
})

// ── construction guards ─────────────────────────────────────────────────

describe('ClerkAuthProvider construction guards', () => {
  test("throws TypeError 'clerkSecretKey required' when missing", () => {
    expect(
      () => new ClerkAuthProvider({ clerkSecretKey: '' as unknown as string } as never),
    ).toThrow(TypeError)
    expect(
      () => new ClerkAuthProvider({ clerkSecretKey: '' as unknown as string } as never),
    ).toThrow('clerkSecretKey required')
  })
})

// ── AuthError smoke ─────────────────────────────────────────────────────

describe('AuthError', () => {
  test('carries code and name', () => {
    const err = new AuthError('TOKEN_INVALID', 'bad')
    expect(err.name).toBe('AuthError')
    expect(err.code).toBe('TOKEN_INVALID')
    expect(err.message).toBe('bad')
  })
})
