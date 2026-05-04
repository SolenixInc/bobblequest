import { describe, expect, test } from 'vitest'
import { MobileConfigValuesSchema, resolveMobileConfig } from '../MobileConfigValuesSchema.ts'

const VALID_ENV = {
  ENVIRONMENT: 'production',
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_expo',
  EXPO_PUBLIC_POSTHOG_KEY: 'phc_expo_test',
  EXPO_PUBLIC_REVENUECAT_APPLE_KEY: 'apple_rc_key',
  EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY: 'google_rc_key',
  EXPO_PUBLIC_API_URL: 'http://api.test/trpc',
}

describe('MobileConfigValuesSchema', () => {
  test('parses valid mobile config object', () => {
    const result = MobileConfigValuesSchema.safeParse({
      system: { environment: 'production', isLocal: false },
      auth: { clerkPublishableKey: 'pk_live_expo' },
      posthog: { apiKey: 'phc_expo_test' },
      revenueCat: { appleApiKey: 'apple_key', googleApiKey: 'google_key' },
      client: { trpcUrl: 'http://api.test/trpc' },
    })
    expect(result.success).toBe(true)
  })

  test('rejects missing auth.clerkPublishableKey', () => {
    const result = MobileConfigValuesSchema.safeParse({
      system: { environment: 'production', isLocal: false },
      auth: {},
      posthog: { apiKey: 'phc_xxx' },
      revenueCat: {},
      client: { trpcUrl: 'http://api.test/trpc' },
    })
    expect(result.success).toBe(false)
  })
})

describe('resolveMobileConfig', () => {
  test('returns parsed config from valid env record', () => {
    const config = resolveMobileConfig(VALID_ENV)
    expect(config.system.environment).toBe('production')
    expect(config.auth.clerkPublishableKey).toBe('pk_live_expo')
    expect(config.posthog.apiKey).toBe('phc_expo_test')
    expect(config.revenueCat.appleApiKey).toBe('apple_rc_key')
    expect(config.revenueCat.googleApiKey).toBe('google_rc_key')
    expect(config.client.trpcUrl).toBe('http://api.test/trpc')
  })

  test('sets system.isLocal=true when environment is "development"', () => {
    const config = resolveMobileConfig({ ...VALID_ENV, ENVIRONMENT: 'development' })
    expect(config.system.isLocal).toBe(true)
  })

  test('sets system.isLocal=true when environment is "local"', () => {
    const config = resolveMobileConfig({ ...VALID_ENV, ENVIRONMENT: 'local' })
    expect(config.system.isLocal).toBe(true)
  })

  test('sets system.isLocal=false when environment is "production"', () => {
    const config = resolveMobileConfig(VALID_ENV)
    expect(config.system.isLocal).toBe(false)
  })

  test('falls back to NODE_ENV when ENVIRONMENT is absent', () => {
    const env: Record<string, string | undefined> = { ...VALID_ENV }
    delete env.ENVIRONMENT
    // 'test' is coerced to 'testing' by EnvironmentSchema; use 'development' for a clean assertion.
    const config = resolveMobileConfig({ ...env, NODE_ENV: 'development' })
    expect(config.system.environment).toBe('development')
  })

  test('revenueCat keys are optional', () => {
    const config = resolveMobileConfig({
      ...VALID_ENV,
      EXPO_PUBLIC_REVENUECAT_APPLE_KEY: undefined,
      EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY: undefined,
    })
    expect(config.revenueCat.appleApiKey).toBeUndefined()
    expect(config.revenueCat.googleApiKey).toBeUndefined()
  })
})
