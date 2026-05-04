import type { ConfigRepository } from '@t/config'
import { createContainer } from '@t/dependency-injection'
import { describe, expect, test } from 'vitest'
import {
  AUTH_DEPENDENCY_KEY,
  registerAuthDI,
} from '../../src/dependency-injection/registerAuthDI.ts'
import { AuthProvider } from '../../src/entities/ports/AuthProvider.ts'
import { ClerkAuthProvider } from '../../src/infrastructure/clerk/ClerkAuthProvider.ts'
import { NoopAuthProvider } from '../../src/infrastructure/noop/NoopAuthProvider.ts'

interface AuthSlice {
  clerkSecretKey?: string
  clerkPublishableKey?: string
  clerkWebhookSecret?: string
}

function fakeConfig(auth: AuthSlice): ConfigRepository {
  return { auth } as unknown as ConfigRepository
}

describe('registerAuthDI — provider selection', () => {
  test('environment=testing → NoopAuthProvider (even with secret key)', () => {
    const container = createContainer()
    registerAuthDI(container, {
      config: fakeConfig({ clerkSecretKey: 'sk_test_abc' }),
      environment: 'testing',
    })
    const resolved = container.resolve(AUTH_DEPENDENCY_KEY)
    expect(resolved).toBeInstanceOf(AuthProvider)
    expect(resolved).toBeInstanceOf(NoopAuthProvider)
  })

  test('missing clerkSecretKey → NoopAuthProvider', () => {
    const container = createContainer()
    registerAuthDI(container, {
      config: fakeConfig({}),
      environment: 'production',
    })
    const resolved = container.resolve(AUTH_DEPENDENCY_KEY)
    expect(resolved).toBeInstanceOf(NoopAuthProvider)
  })

  test('happy path → ClerkAuthProvider', () => {
    const container = createContainer()
    registerAuthDI(container, {
      config: fakeConfig({ clerkSecretKey: 'sk_test_abc' }),
      environment: 'production',
    })
    const resolved = container.resolve(AUTH_DEPENDENCY_KEY)
    expect(resolved).toBeInstanceOf(ClerkAuthProvider)
    expect(resolved).not.toBeInstanceOf(NoopAuthProvider)
  })

  test('provider is singleton (same instance across resolves)', () => {
    const container = createContainer()
    registerAuthDI(container, {
      config: fakeConfig({ clerkSecretKey: 'sk_test_abc' }),
      environment: 'production',
    })
    const a = container.resolve(AUTH_DEPENDENCY_KEY)
    const b = container.resolve(AUTH_DEPENDENCY_KEY)
    expect(a).toBe(b)
  })
})
