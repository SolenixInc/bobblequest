import type { ConfigRepository } from '@t/config'
import { createContainer } from '@t/dependency-injection'
import { describe, expect, test } from 'vitest'
import { registerAuthDI } from '../../src/dependency-injection/registerAuthDI.ts'
import { ClerkAuthProvider } from '../../src/infrastructure/clerk/ClerkAuthProvider.ts'
import { NoopAuthProvider } from '../../src/infrastructure/noop/NoopAuthProvider.ts'

function fakeConfig(auth: Record<string, unknown>): ConfigRepository {
  return { auth } as unknown as ConfigRepository
}

describe('registerAuthDI — branch coverage', () => {
  test('with all clerk keys (covers publishableKey + webhookSecret string branches)', () => {
    const container = createContainer()
    registerAuthDI(container, {
      config: fakeConfig({
        clerkSecretKey: 'sk_test_abc',
        clerkPublishableKey: 'pk_test_abc',
        clerkWebhookSecret: 'whsec_abc',
      }),
      environment: 'production',
      authorizedParties: ['http://localhost:3000'],
    })
    const resolved = container.resolve('auth')
    expect(resolved).toBeInstanceOf(ClerkAuthProvider)
  })

  test('config.auth undefined → falls back to {} (covers auth ?? {} branch)', () => {
    const container = createContainer()
    // Pass a config with no auth property at all
    registerAuthDI(container, {
      config: {} as unknown as ConfigRepository,
      environment: 'production',
    })
    const resolved = container.resolve('auth')
    expect(resolved).toBeInstanceOf(NoopAuthProvider)
  })

  test('non-string clerkPublishableKey is treated as undefined', () => {
    const container = createContainer()
    registerAuthDI(container, {
      config: fakeConfig({
        clerkSecretKey: 'sk_test_abc',
        clerkPublishableKey: 123, // not a string
        clerkWebhookSecret: null, // not a string
      }),
      environment: 'production',
    })
    const resolved = container.resolve('auth')
    expect(resolved).toBeInstanceOf(ClerkAuthProvider)
  })

  test('testing env with userSync callback still returns NoopAuthProvider', () => {
    const container = createContainer()
    registerAuthDI(container, {
      config: fakeConfig({}),
      environment: 'testing',
      userSync: async () => {},
    })
    const resolved = container.resolve('auth')
    expect(resolved).toBeInstanceOf(NoopAuthProvider)
  })
})
