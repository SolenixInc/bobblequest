import { describe, expect, test, vi } from 'vitest'
import { ClerkAuthProvider } from '../../src/infrastructure/clerk/ClerkAuthProvider.ts'

type FakeClerkUser = {
  id: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  primaryEmailAddressId: string | null
  emailAddresses: Array<{ id: string; emailAddress: string }>
  publicMetadata: Record<string, unknown>
}

function makeProvider(
  options: {
    user?: Partial<FakeClerkUser>
    getUserImpl?: (id: string) => Promise<unknown>
    verifyImpl?: (token: string, opts: unknown) => Promise<unknown>
  } = {},
) {
  const baseUser: FakeClerkUser = {
    id: 'user_123',
    firstName: 'A',
    lastName: 'B',
    imageUrl: null,
    primaryEmailAddressId: 'email_1',
    emailAddresses: [{ id: 'email_1', emailAddress: 'a@example.com' }],
    publicMetadata: {},
    ...options.user,
  }
  const getUserSpy = vi.fn(options.getUserImpl ?? (async () => baseUser))
  const tokenVerifier = vi.fn(
    options.verifyImpl ??
      (async () => ({
        sub: baseUser.id,
        sid: 'sess_1',
        iat: 1_700_000_000,
        exp: 1_700_003_600,
        iss: 'https://test.clerk.com',
      })),
  )
  const provider = new ClerkAuthProvider({
    clerkSecretKey: 'sk_test_abc',
    clerkClientFactory: vi.fn(() => ({ users: { getUser: getUserSpy } })) as never,
    tokenVerifier: tokenVerifier as never,
  })
  return { provider, getUserSpy }
}

describe('ClerkAuthProvider — email fallback branch (lines 107-108)', () => {
  test('falls back to first email when primaryEmailAddressId not found in list', async () => {
    const { provider } = makeProvider({
      user: {
        primaryEmailAddressId: 'email_notfound',
        emailAddresses: [{ id: 'email_1', emailAddress: 'fallback@example.com' }],
      },
    })
    const user = await provider.verify('token')
    // primaryEmailAddressId doesn't match any email id → falls back to first email
    expect(user.email).toBe('fallback@example.com')
  })

  test('returns null email when emailAddresses is empty and primaryId unset', async () => {
    const { provider } = makeProvider({
      user: {
        primaryEmailAddressId: null,
        emailAddresses: [],
      },
    })
    const user = await provider.verify('token')
    expect(user.email).toBeNull()
  })
})

describe('ClerkAuthProvider — null firstName/lastName coalescing (lines 115-116)', () => {
  test('returns null firstName and lastName when they are null in Clerk user', async () => {
    const { provider } = makeProvider({
      user: { firstName: null, lastName: null },
    })
    const user = await provider.verify('token')
    expect(user.firstName).toBeNull()
    expect(user.lastName).toBeNull()
  })
})

describe('ClerkAuthProvider — wrapVerifyError with non-Error cause (line 123)', () => {
  test('wraps non-Error thrown value via String()', async () => {
    const { provider } = makeProvider({
      verifyImpl: async () => {
        throw 'plain string error'
      },
    })
    await expect(provider.verify('token')).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
    })
  })
})

describe('ClerkAuthProvider.currentUser — non-AuthError rethrow branch (lines 81-82)', () => {
  test('rethrows non-AuthError exceptions from hydrateUser', async () => {
    // Make getUserSpy throw a plain Error that is NOT wrapped by wrapVerifyError
    // (hydrateUser catches it and throws AuthError("USER_NOT_FOUND"))
    // Actually hydrateUser wraps to AuthError so we need to bypass it.
    // We can do this by making the clerkClient.users.getUser throw a non-Error that
    // hydrateUser re-wraps, but that's always AuthError. Instead, let's set up a
    // provider where verify() itself throws a non-AuthError by making tokenVerifier
    // return a valid payload but getUserImpl throw TypeError directly.
    // Since hydrateUser wraps all errors in AuthError, the only way to get a
    // non-AuthError through currentUser is to have the Error come from something
    // outside verify()'s catch block — which is hydrateUser's raw throw. But since
    // hydrateUser always wraps, we need to subclass and override.

    // Actually the cleanest approach: make a subclass that overrides verify() to throw non-AuthError
    class BrokenProvider extends ClerkAuthProvider {
      override async verify(): Promise<never> {
        throw new TypeError('unexpected internal error')
      }
    }
    const provider = new BrokenProvider({
      clerkSecretKey: 'sk_test_abc',
      clerkClientFactory: vi.fn(() => ({ users: { getUser: vi.fn() } })) as never,
      tokenVerifier: vi.fn() as never,
    })
    await expect(provider.currentUser('token')).rejects.toThrow(TypeError)
    await expect(provider.currentUser('token')).rejects.toThrow('unexpected internal error')
  })
})
