import { describe, expect, test } from 'vitest'
import { WebConfigValuesSchema, resolveWebConfig } from '../WebConfigValuesSchema.ts'

const BASE_ENV = {
  ENVIRONMENT: 'testing',
  CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
}

describe('resolveWebConfig', () => {
  test('parses minimal valid env', () => {
    const result = resolveWebConfig(BASE_ENV)
    expect(result.system.environment).toBe('testing')
    expect(result.auth.clerkPublishableKey).toBe('pk_test_abc')
  })

  test('uses NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY fallback when CLERK_PUBLISHABLE_KEY absent', () => {
    const result = resolveWebConfig({
      ENVIRONMENT: 'testing',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_next_abc',
    })
    expect(result.auth.clerkPublishableKey).toBe('pk_next_abc')
  })

  test('system.isLocal is false when environment is "testing"', () => {
    const result = resolveWebConfig({ ...BASE_ENV })
    expect(result.system.isLocal).toBe(false)
  })

  test('system.isLocal is true when environment is "local"', () => {
    const result = resolveWebConfig({ ...BASE_ENV, ENVIRONMENT: 'local' })
    expect(result.system.isLocal).toBe(true)
  })

  test('system.isLocal is true when environment is "development"', () => {
    const result = resolveWebConfig({ ...BASE_ENV, ENVIRONMENT: 'development' })
    expect(result.system.isLocal).toBe(true)
  })

  test('system.port parses from PORT env var', () => {
    const result = resolveWebConfig({ ...BASE_ENV, PORT: '4000' })
    expect(result.system.port).toBe(4000)
  })

  test('system.port defaults to 8000 when PORT absent', () => {
    const result = resolveWebConfig({ ...BASE_ENV })
    expect(result.system.port).toBe(8000)
  })

  test("system.logLevel defaults to 'debug' when LOG_LEVEL absent", () => {
    const result = resolveWebConfig({ ...BASE_ENV })
    expect(result.system.logLevel).toBe('debug')
  })

  test('system.logLevel reads from LOG_LEVEL', () => {
    const result = resolveWebConfig({ ...BASE_ENV, LOG_LEVEL: 'info' })
    expect(result.system.logLevel).toBe('info')
  })

  test('falls back to NODE_ENV when ENVIRONMENT absent', () => {
    const result = resolveWebConfig({
      NODE_ENV: 'production',
      CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
    })
    expect(result.system.environment).toBe('production')
  })
})

describe('WebConfigValuesSchema', () => {
  test('is a valid zod schema', () => {
    expect(typeof WebConfigValuesSchema.parse).toBe('function')
  })
})

describe('resolveWebConfig — client.trpcUrl', () => {
  test('uses NEXT_PUBLIC_TRPC_URL when provided', () => {
    const result = resolveWebConfig({
      ...BASE_ENV,
      NEXT_PUBLIC_TRPC_URL: 'https://api.example.com/trpc',
    })
    expect(result.client.trpcUrl).toBe('https://api.example.com/trpc')
  })

  test('defaults to localhost dev URL when NEXT_PUBLIC_TRPC_URL is absent', () => {
    const result = resolveWebConfig({ ...BASE_ENV })
    expect(result.client.trpcUrl).toBe('http://localhost:3001/trpc')
  })

  test('rejects a non-URL value for NEXT_PUBLIC_TRPC_URL', () => {
    expect(() => resolveWebConfig({ ...BASE_ENV, NEXT_PUBLIC_TRPC_URL: 'not-a-url' })).toThrow()
  })
})
