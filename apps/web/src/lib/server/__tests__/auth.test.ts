import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// Stub 'server-only' so Vitest (which runs in Node, not the Next.js server
// context) doesn't throw when the module is imported.
vi.mock('server-only', () => ({}))

// Both helpers read their respective env vars at *call* time, so a static
// top-level import is correct — no dynamic re-import needed.
import { isClerkConfigured, isClerkConfiguredClient } from '../auth.js'

// ---------------------------------------------------------------------------
// isClerkConfiguredClient — gates <ClerkProvider> on the publishable key
// ---------------------------------------------------------------------------

describe('isClerkConfiguredClient', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('returns true when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is a non-empty string', () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')
    expect(isClerkConfiguredClient()).toBe(true)
  })

  test('returns false when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is the empty string', () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', '')
    expect(isClerkConfiguredClient()).toBe(false)
  })

  test('returns false when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is undefined', () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', undefined as unknown as string)
    expect(isClerkConfiguredClient()).toBe(false)
  })

  test('returns true when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is a placeholder value', () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder_replace_me')
    expect(isClerkConfiguredClient()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isClerkConfigured — gates server-only auth() calls on the secret key
// ---------------------------------------------------------------------------

describe('isClerkConfigured', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('returns true when CLERK_SECRET_KEY is a non-empty string', () => {
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_abc123')
    expect(isClerkConfigured()).toBe(true)
  })

  test('returns false when CLERK_SECRET_KEY is the empty string', () => {
    vi.stubEnv('CLERK_SECRET_KEY', '')
    expect(isClerkConfigured()).toBe(false)
  })

  test('returns false when CLERK_SECRET_KEY is undefined', () => {
    // Remove the key entirely — Boolean(undefined) is false
    vi.stubEnv('CLERK_SECRET_KEY', undefined as unknown as string)
    expect(isClerkConfigured()).toBe(false)
  })

  test('returns true when CLERK_SECRET_KEY is a placeholder value', () => {
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder_replace_me')
    expect(isClerkConfigured()).toBe(true)
  })
})
