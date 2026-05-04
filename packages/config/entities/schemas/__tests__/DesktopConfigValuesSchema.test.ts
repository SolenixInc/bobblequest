import { describe, expect, test } from 'vitest'
import { DesktopConfigValuesSchema, resolveDesktopConfig } from '../DesktopConfigValuesSchema.ts'

const BASE_ENV = {
  ENVIRONMENT: 'testing',
  CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
  POSTHOG_API_KEY: 'phc_test_key_abc',
}

describe('resolveDesktopConfig', () => {
  test('parses minimal valid env', () => {
    const result = resolveDesktopConfig(BASE_ENV)
    expect(result.system.environment).toBe('testing')
    expect(result.auth.clerkPublishableKey).toBe('pk_test_abc')
    expect(result.posthog.apiKey).toBe('phc_test_key_abc')
  })

  test('uses VITE_CLERK_PUBLISHABLE_KEY fallback when CLERK_PUBLISHABLE_KEY absent', () => {
    const result = resolveDesktopConfig({
      ENVIRONMENT: 'testing',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_vite_abc',
      POSTHOG_API_KEY: 'phc_test_key_abc',
    })
    expect(result.auth.clerkPublishableKey).toBe('pk_vite_abc')
  })

  test('prefers CLERK_PUBLISHABLE_KEY over VITE_CLERK_PUBLISHABLE_KEY', () => {
    const result = resolveDesktopConfig({
      ENVIRONMENT: 'testing',
      CLERK_PUBLISHABLE_KEY: 'pk_main_abc',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_vite_abc',
      POSTHOG_API_KEY: 'phc_test_key_abc',
    })
    expect(result.auth.clerkPublishableKey).toBe('pk_main_abc')
  })

  test('system.isLocal is false when environment is "testing"', () => {
    const result = resolveDesktopConfig({ ...BASE_ENV })
    expect(result.system.isLocal).toBe(false)
  })

  test('system.isLocal is true when environment is "local"', () => {
    const result = resolveDesktopConfig({ ...BASE_ENV, ENVIRONMENT: 'local' })
    expect(result.system.isLocal).toBe(true)
  })

  test('system.isLocal is true when environment is "development"', () => {
    const result = resolveDesktopConfig({ ...BASE_ENV, ENVIRONMENT: 'development' })
    expect(result.system.isLocal).toBe(true)
  })

  test('system.port parses from PORT env var', () => {
    const result = resolveDesktopConfig({ ...BASE_ENV, PORT: '4000' })
    expect(result.system.port).toBe(4000)
  })

  test('system.port defaults to 8000 when PORT absent', () => {
    const result = resolveDesktopConfig({ ...BASE_ENV })
    expect(result.system.port).toBe(8000)
  })

  test("system.logLevel defaults to 'debug' when LOG_LEVEL absent", () => {
    const result = resolveDesktopConfig({ ...BASE_ENV })
    expect(result.system.logLevel).toBe('debug')
  })

  test('system.logLevel reads from LOG_LEVEL', () => {
    const result = resolveDesktopConfig({ ...BASE_ENV, LOG_LEVEL: 'info' })
    expect(result.system.logLevel).toBe('info')
  })

  test('falls back to NODE_ENV when ENVIRONMENT absent', () => {
    const result = resolveDesktopConfig({
      NODE_ENV: 'production',
      CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
      POSTHOG_API_KEY: 'phc_test_key_abc',
    })
    expect(result.system.environment).toBe('production')
  })

  test('defaults to "development" when ENVIRONMENT and NODE_ENV are both absent', () => {
    const result = resolveDesktopConfig({
      CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
      POSTHOG_API_KEY: 'phc_test_key_abc',
    })
    expect(result.system.environment).toBe('development')
    // isLocal is derived from the raw env string before Zod default kicks in,
    // so undefined !== 'local' && undefined !== 'development' => false
    expect(result.system.isLocal).toBe(false)
  })

  test('auth fields are optional — parses without publishable key', () => {
    const result = resolveDesktopConfig({
      ENVIRONMENT: 'testing',
      POSTHOG_API_KEY: 'phc_test_key_abc',
    })
    expect(result.auth.clerkPublishableKey).toBeUndefined()
  })

  test('throws when POSTHOG_API_KEY is absent', () => {
    const { POSTHOG_API_KEY: _, ...withoutPosthog } = BASE_ENV
    expect(() => resolveDesktopConfig(withoutPosthog)).toThrow()
  })

  test('throws when POSTHOG_API_KEY is empty string', () => {
    expect(() => resolveDesktopConfig({ ...BASE_ENV, POSTHOG_API_KEY: '' })).toThrow()
  })

  test('accepts VITE_POSTHOG_KEY as fallback when POSTHOG_API_KEY absent', () => {
    const { POSTHOG_API_KEY: _, ...withoutPosthog } = BASE_ENV
    const result = resolveDesktopConfig({ ...withoutPosthog, VITE_POSTHOG_KEY: 'phc_vite_key' })
    expect(result.posthog.apiKey).toBe('phc_vite_key')
  })
})

describe('DesktopConfigValuesSchema', () => {
  test('is a valid zod schema', () => {
    expect(typeof DesktopConfigValuesSchema.parse).toBe('function')
  })

  test('parses a full valid object', () => {
    const result = DesktopConfigValuesSchema.parse({
      system: {
        environment: 'testing',
        logLevel: 'warn',
        isLocal: false,
        port: 3000,
      },
      auth: {
        clerkPublishableKey: 'pk_test_xyz',
      },
      posthog: {
        apiKey: 'phc_test_key',
      },
    })
    expect(result.system.environment).toBe('testing')
    expect(result.system.logLevel).toBe('warn')
    expect(result.system.port).toBe(3000)
    expect(result.auth.clerkPublishableKey).toBe('pk_test_xyz')
    expect(result.posthog.apiKey).toBe('phc_test_key')
  })

  test('rejects invalid environment value', () => {
    const result = DesktopConfigValuesSchema.safeParse({
      system: { environment: 'staging', logLevel: 'debug', isLocal: false },
      auth: {},
      posthog: { apiKey: 'phc_test_key' },
    })
    expect(result.success).toBe(false)
  })

  test('rejects missing posthog block', () => {
    const result = DesktopConfigValuesSchema.safeParse({
      system: { environment: 'testing', isLocal: false },
      auth: {},
    })
    expect(result.success).toBe(false)
  })

  test('rejects empty posthog.apiKey', () => {
    const result = DesktopConfigValuesSchema.safeParse({
      system: { environment: 'testing', isLocal: false },
      auth: {},
      posthog: { apiKey: '' },
    })
    expect(result.success).toBe(false)
  })

  test('system.logLevel defaults to "debug" when omitted', () => {
    const result = DesktopConfigValuesSchema.parse({
      system: { environment: 'testing', isLocal: false },
      auth: {},
      posthog: { apiKey: 'phc_test_key' },
    })
    expect(result.system.logLevel).toBe('debug')
  })

  test('system.port defaults to 8000 when omitted', () => {
    const result = DesktopConfigValuesSchema.parse({
      system: { environment: 'testing', isLocal: false },
      auth: {},
      posthog: { apiKey: 'phc_test_key' },
    })
    expect(result.system.port).toBe(8000)
  })
})
