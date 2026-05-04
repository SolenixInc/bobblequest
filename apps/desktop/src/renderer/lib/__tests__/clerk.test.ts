/**
 * Verifies clerk.ts behavior with and without VITE_CLERK_PUBLISHABLE_KEY.
 *
 * clerk.publishableKey is optional — absent/empty → undefined → auth UI disabled.
 * TrpcProvider in providers.tsx gates ClerkProvider on the key being defined,
 * matching the web app's isClerkConfigured() pattern in layout.tsx.
 *
 * Strategy: vitest's `vi.stubEnv` sets values on `import.meta.env` before
 * module evaluation. We use `vi.resetModules()` to force a fresh module
 * evaluation on each test so the env value is picked up at module init time.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// @clerk/clerk-react is a DOM-oriented package; stub it so the node test
// environment doesn't choke on browser globals it doesn't provide.
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: () => null,
  SignedIn: () => null,
  SignedOut: () => null,
  useAuth: () => ({}),
  useClerk: () => ({}),
  useSignIn: () => ({}),
  useUser: () => ({}),
}))

describe('clerk.ts — env guard', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('exports CLERK_PUBLISHABLE_KEY as undefined when VITE_CLERK_PUBLISHABLE_KEY is absent (auth-disabled path)', async () => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', '')

    const mod = await import('../clerk')
    expect(mod.CLERK_PUBLISHABLE_KEY).toBeUndefined()
  })

  it('exports the key when VITE_CLERK_PUBLISHABLE_KEY is present', async () => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')
    vi.stubEnv('VITE_API_URL', 'http://localhost:3001')

    const mod = await import('../clerk')
    expect(mod.CLERK_PUBLISHABLE_KEY).toBe('pk_test_abc123')
  })
})
