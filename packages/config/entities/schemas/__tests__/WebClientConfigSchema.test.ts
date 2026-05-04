import { describe, expect, test } from 'vitest'
import { WebClientConfigSchema, resolveWebClientConfig } from '../WebClientConfigSchema.ts'

const VALID_ENV = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
  NEXT_PUBLIC_TRPC_URL: 'https://api.example.com/trpc',
  NEXT_PUBLIC_POSTHOG_KEY: 'phc_test_key_abc123',
}

describe('resolveWebClientConfig — happy path', () => {
  test('returns parsed config with only required fields', () => {
    const result = resolveWebClientConfig(VALID_ENV)

    expect(result.clerk.publishableKey).toBe('pk_test_abc123')
    expect(result.trpc.url).toBe('https://api.example.com/trpc')
  })

  test('environment defaults to "development" when absent', () => {
    const result = resolveWebClientConfig(VALID_ENV)
    expect(result.environment).toBe('development')
  })

  test('environment reads from NEXT_PUBLIC_ENVIRONMENT', () => {
    const result = resolveWebClientConfig({ ...VALID_ENV, NEXT_PUBLIC_ENVIRONMENT: 'production' })
    expect(result.environment).toBe('production')
  })
})

describe('resolveWebClientConfig — optional fields default correctly', () => {
  test('posthog.host defaults to https://us.i.posthog.com when absent', () => {
    const result = resolveWebClientConfig(VALID_ENV)
    expect(result.posthog.host).toBe('https://us.i.posthog.com')
  })

  test('posthog.key is set from NEXT_PUBLIC_POSTHOG_KEY', () => {
    const result = resolveWebClientConfig(VALID_ENV)
    expect(result.posthog.key).toBe('phc_test_key_abc123')
  })

  test('posthog.host reads from NEXT_PUBLIC_POSTHOG_HOST', () => {
    const result = resolveWebClientConfig({
      ...VALID_ENV,
      NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
    })
    expect(result.posthog.host).toBe('https://eu.i.posthog.com')
  })

  test('revenueCat.publicApiKey is undefined when absent', () => {
    const result = resolveWebClientConfig(VALID_ENV)
    expect(result.revenueCat.publicApiKey).toBeUndefined()
  })

  test('revenueCat.publicApiKey is undefined when empty string', () => {
    const result = resolveWebClientConfig({
      ...VALID_ENV,
      NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY: '',
    })
    expect(result.revenueCat.publicApiKey).toBeUndefined()
  })

  test('revenueCat.publicApiKey is set when non-empty value provided', () => {
    const result = resolveWebClientConfig({
      ...VALID_ENV,
      NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY: 'rcb_abc123',
    })
    expect(result.revenueCat.publicApiKey).toBe('rcb_abc123')
  })
})

describe('resolveWebClientConfig — optional/absent fields', () => {
  test('posthog.key is undefined when NEXT_PUBLIC_POSTHOG_KEY is absent', () => {
    const { NEXT_PUBLIC_POSTHOG_KEY: _, ...withoutPosthog } = VALID_ENV
    const result = resolveWebClientConfig(withoutPosthog)
    expect(result.posthog.key).toBeUndefined()
  })

  test('posthog.key is undefined when NEXT_PUBLIC_POSTHOG_KEY is empty string', () => {
    const result = resolveWebClientConfig({ ...VALID_ENV, NEXT_PUBLIC_POSTHOG_KEY: '' })
    expect(result.posthog.key).toBeUndefined()
  })

  test('clerk.publishableKey is undefined when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is absent', () => {
    // Auth is optional — absent key means auth UI is disabled, app still boots.
    // ClerkProvider is gated in layout.tsx via isClerkConfigured().
    const result = resolveWebClientConfig({
      NEXT_PUBLIC_TRPC_URL: 'https://api.example.com/trpc',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_test',
    })
    expect(result.clerk.publishableKey).toBeUndefined()
  })

  test('clerk.publishableKey is undefined when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is empty string', () => {
    const result = resolveWebClientConfig({
      ...VALID_ENV,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
    })
    expect(result.clerk.publishableKey).toBeUndefined()
  })

  test('trpc.url defaults to http://localhost:3000/trpc when NEXT_PUBLIC_TRPC_URL is absent', () => {
    const result = resolveWebClientConfig({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
    })
    expect(result.trpc.url).toBe('http://localhost:3000/trpc')
  })

  test('throws when NEXT_PUBLIC_TRPC_URL is not a valid URL', () => {
    expect(() =>
      resolveWebClientConfig({
        ...VALID_ENV,
        NEXT_PUBLIC_TRPC_URL: 'not-a-url',
      }),
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

describe('WebClientConfigSchema', () => {
  test('is a valid zod schema', () => {
    expect(typeof WebClientConfigSchema.parse).toBe('function')
  })
})
