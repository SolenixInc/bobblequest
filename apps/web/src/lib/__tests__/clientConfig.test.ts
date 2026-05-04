import { resolveWebClientConfig } from '@t/config/browser'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const VALID_ENV = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
  NEXT_PUBLIC_TRPC_URL: 'https://api.example.com/trpc',
}

// ---------------------------------------------------------------------------
// webClientConfig module — integration smoke-test
// The module calls resolveWebClientConfig at import time using process.env.
// vi.stubEnv / vi.unstubAllEnvs is the correct Vitest API for env isolation:
// it restores the original value (or removes the key) on unstub.
// vi.resetModules() forces a fresh module evaluation each test.
// ---------------------------------------------------------------------------
describe('webClientConfig module', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('exposes all expected fields when env is valid', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')
    vi.stubEnv('NEXT_PUBLIC_TRPC_URL', 'https://api.example.com/trpc')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_testkey')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com')
    vi.stubEnv('NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY', 'rcb_testkey')
    vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')

    const { webClientConfig } = await import('../clientConfig.js')

    expect(webClientConfig.clerk.publishableKey).toBe('pk_test_abc123')
    expect(webClientConfig.trpc.url).toBe('https://api.example.com/trpc')
    expect(webClientConfig.posthog.key).toBe('phc_testkey')
    expect(webClientConfig.posthog.host).toBe('https://eu.i.posthog.com')
    expect(webClientConfig.revenueCat.publicApiKey).toBe('rcb_testkey')
    expect(webClientConfig.environment).toBe('production')
  })

  test('memoization: repeated imports return the same object reference', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_memo')
    vi.stubEnv('NEXT_PUBLIC_TRPC_URL', 'https://api.example.com/trpc')

    const { webClientConfig: config1 } = await import('../clientConfig.js')
    const { webClientConfig: config2 } = await import('../clientConfig.js')

    // Module-level constant — same reference across multiple imports of same module instance
    expect(config1).toBe(config2)
  })

  test('boots successfully without NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (auth-disabled path)', async () => {
    // clerk.publishableKey is now optional so a fresh clone with only .env.example defaults
    // can render the root page. ClerkProvider is gated in layout.tsx via isClerkConfigured().
    // Force-clear in case turbo leaks the real env var from the parent process.
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', '')
    vi.stubEnv('NEXT_PUBLIC_TRPC_URL', 'https://api.example.com/trpc')

    const { webClientConfig: cfg } = await import('../clientConfig.js')
    expect(cfg.clerk.publishableKey).toBeUndefined()
    expect(cfg.trpc.url).toBe('https://api.example.com/trpc')
  })

  test('boots successfully without NEXT_PUBLIC_TRPC_URL (falls back to default)', async () => {
    // trpc.url defaults to http://localhost:3000/trpc when absent
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')

    const { webClientConfig: cfg } = await import('../clientConfig.js')
    expect(cfg.trpc.url).toBe('http://localhost:3000/trpc')
  })

  test('posthog.key absent → undefined; posthog.host defaults to us.i.posthog.com', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')
    vi.stubEnv('NEXT_PUBLIC_TRPC_URL', 'https://api.example.com/trpc')

    const { webClientConfig: cfg } = await import('../clientConfig.js')
    expect(cfg.posthog.key).toBeUndefined()
    expect(cfg.posthog.host).toBe('https://us.i.posthog.com')
  })

  test('posthog.key and posthog.host populated from env', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')
    vi.stubEnv('NEXT_PUBLIC_TRPC_URL', 'https://api.example.com/trpc')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_customkey')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com')

    const { webClientConfig: cfg } = await import('../clientConfig.js')
    expect(cfg.posthog.key).toBe('phc_customkey')
    expect(cfg.posthog.host).toBe('https://eu.i.posthog.com')
  })

  test('revenueCat.publicApiKey absent → undefined', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')
    vi.stubEnv('NEXT_PUBLIC_TRPC_URL', 'https://api.example.com/trpc')

    const { webClientConfig: cfg } = await import('../clientConfig.js')
    expect(cfg.revenueCat.publicApiKey).toBeUndefined()
  })

  test('revenueCat.publicApiKey populated from env', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')
    vi.stubEnv('NEXT_PUBLIC_TRPC_URL', 'https://api.example.com/trpc')
    vi.stubEnv('NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY', 'rcb_testkey')

    const { webClientConfig: cfg } = await import('../clientConfig.js')
    expect(cfg.revenueCat.publicApiKey).toBe('rcb_testkey')
  })

  test('NEXT_PUBLIC_ENVIRONMENT propagated from env', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')
    vi.stubEnv('NEXT_PUBLIC_TRPC_URL', 'https://api.example.com/trpc')
    vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')

    const { webClientConfig: cfg } = await import('../clientConfig.js')
    expect(cfg.environment).toBe('production')
  })

  test('environment defaults to "development" when NEXT_PUBLIC_ENVIRONMENT absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_abc123')
    vi.stubEnv('NEXT_PUBLIC_TRPC_URL', 'https://api.example.com/trpc')

    const { webClientConfig: cfg } = await import('../clientConfig.js')
    expect(cfg.environment).toBe('development')
  })
})

// ---------------------------------------------------------------------------
// resolveWebClientConfig — schema-level unit tests
// These do not go through the Next.js module composition root, so they are
// not affected by process.env inlining and can run synchronously.
// ---------------------------------------------------------------------------
describe('resolveWebClientConfig — required fields', () => {
  test('returns clerk.publishableKey and trpc.url from env record', () => {
    const cfg = resolveWebClientConfig(VALID_ENV)
    expect(cfg.clerk.publishableKey).toBe('pk_test_abc123')
    expect(cfg.trpc.url).toBe('https://api.example.com/trpc')
  })

  test('clerk.publishableKey is undefined when key is absent (auth-disabled path)', () => {
    const cfg = resolveWebClientConfig({ NEXT_PUBLIC_TRPC_URL: 'https://api.example.com/trpc' })
    expect(cfg.clerk.publishableKey).toBeUndefined()
  })

  test('clerk.publishableKey is undefined when key is empty string (auth-disabled path)', () => {
    const cfg = resolveWebClientConfig({ ...VALID_ENV, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '' })
    expect(cfg.clerk.publishableKey).toBeUndefined()
  })

  test('trpc.url defaults to http://localhost:3000/trpc when absent', () => {
    const cfg = resolveWebClientConfig({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
    })
    expect(cfg.trpc.url).toBe('http://localhost:3000/trpc')
  })

  test('throws when trpc url is not a valid URL', () => {
    expect(() =>
      resolveWebClientConfig({ ...VALID_ENV, NEXT_PUBLIC_TRPC_URL: 'not-a-url' }),
    ).toThrow('WebClientConfig validation failed')
  })

  test('error message includes failing field path when trpc url is invalid', () => {
    try {
      resolveWebClientConfig({ ...VALID_ENV, NEXT_PUBLIC_TRPC_URL: 'not-a-url' })
      expect.fail('Expected error was not thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).message).toContain('trpc.url')
    }
  })
})

describe('resolveWebClientConfig — optional field defaults', () => {
  test('environment defaults to "development" when absent', () => {
    const cfg = resolveWebClientConfig(VALID_ENV)
    expect(cfg.environment).toBe('development')
  })

  test('posthog.host defaults to https://us.i.posthog.com', () => {
    const cfg = resolveWebClientConfig(VALID_ENV)
    expect(cfg.posthog.host).toBe('https://us.i.posthog.com')
  })

  test('posthog.key is undefined when absent', () => {
    const cfg = resolveWebClientConfig(VALID_ENV)
    expect(cfg.posthog.key).toBeUndefined()
  })

  test('posthog.key is undefined when empty string', () => {
    const cfg = resolveWebClientConfig({ ...VALID_ENV, NEXT_PUBLIC_POSTHOG_KEY: '' })
    expect(cfg.posthog.key).toBeUndefined()
  })

  test('revenueCat.publicApiKey is undefined when absent — NoOp tracker selected', () => {
    const cfg = resolveWebClientConfig(VALID_ENV)
    expect(cfg.revenueCat.publicApiKey).toBeUndefined()
  })

  test('revenueCat.publicApiKey is undefined when empty string — NoOp tracker selected', () => {
    const cfg = resolveWebClientConfig({
      ...VALID_ENV,
      NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY: '',
    })
    expect(cfg.revenueCat.publicApiKey).toBeUndefined()
  })

  test('revenueCat.publicApiKey is set when non-empty value provided', () => {
    const cfg = resolveWebClientConfig({
      ...VALID_ENV,
      NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY: 'rcb_abc123',
    })
    expect(cfg.revenueCat.publicApiKey).toBe('rcb_abc123')
  })
})
