import { beforeAll, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @clerk/nextjs — provide stubs for every named export so the re-export
// module has something to re-export at module load time.
// ---------------------------------------------------------------------------
const { stubClerkProvider, stubSignIn, stubUseAuth, stubUseUser } = vi.hoisted(() => {
  const stubClerkProvider = vi.fn()
  const stubSignIn = vi.fn()
  const stubUseAuth = vi.fn()
  const stubUseUser = vi.fn()
  return { stubClerkProvider, stubSignIn, stubUseAuth, stubUseUser }
})

vi.mock('@clerk/nextjs', () => ({
  ClerkProvider: stubClerkProvider,
  SignIn: stubSignIn,
  useAuth: stubUseAuth,
  useUser: stubUseUser,
}))

// ---------------------------------------------------------------------------
// Load the re-export module after mocks are registered.
// ---------------------------------------------------------------------------
let ClerkProvider: unknown
let SignIn: unknown
let useAuth: unknown
let useUser: unknown

beforeAll(async () => {
  const mod = await import('../clerk.js')
  ClerkProvider = mod.ClerkProvider
  SignIn = mod.SignIn
  useAuth = mod.useAuth
  useUser = mod.useUser
})

// ---------------------------------------------------------------------------
// Tests — each re-exported binding must equal the stub from the mock.
// ---------------------------------------------------------------------------

describe('clerk re-exports', () => {
  test('ClerkProvider is re-exported from @clerk/nextjs', () => {
    expect(ClerkProvider).toBe(stubClerkProvider)
  })

  test('SignIn is re-exported from @clerk/nextjs', () => {
    expect(SignIn).toBe(stubSignIn)
  })

  test('useAuth is re-exported from @clerk/nextjs', () => {
    expect(useAuth).toBe(stubUseAuth)
  })

  test('useUser is re-exported from @clerk/nextjs', () => {
    expect(useUser).toBe(stubUseUser)
  })

  test('ClerkProvider is a function', () => {
    expect(typeof ClerkProvider).toBe('function')
  })

  test('SignIn is a function', () => {
    expect(typeof SignIn).toBe('function')
  })

  test('useAuth is a function', () => {
    expect(typeof useAuth).toBe('function')
  })

  test('useUser is a function', () => {
    expect(typeof useUser).toBe('function')
  })
})
