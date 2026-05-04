import { describe, expect, test } from 'vitest'
import { AuthConfigSchema, resolveAuthConfig } from '../AuthConfigSchema.ts'

describe('AuthConfigSchema', () => {
  test('accepts empty object (all fields optional)', () => {
    expect(AuthConfigSchema.safeParse({}).success).toBe(true)
  })

  test('accepts all fields populated', () => {
    const result = AuthConfigSchema.parse({
      clerkPublishableKey: 'pk_test_xxx',
      clerkSecretKey: 'sk_test_xxx',
      clerkWebhookSecret: 'whsec_xxx',
    })
    expect(result.clerkPublishableKey).toBe('pk_test_xxx')
    expect(result.clerkSecretKey).toBe('sk_test_xxx')
    expect(result.clerkWebhookSecret).toBe('whsec_xxx')
  })
})

describe('resolveAuthConfig', () => {
  test('maps CLERK_* env vars', () => {
    const cfg = resolveAuthConfig({
      CLERK_PUBLISHABLE_KEY: 'pk_test',
      CLERK_SECRET_KEY: 'sk_test',
      CLERK_WEBHOOK_SECRET: 'whsec_test',
    })
    expect(cfg.clerkPublishableKey).toBe('pk_test')
    expect(cfg.clerkSecretKey).toBe('sk_test')
    expect(cfg.clerkWebhookSecret).toBe('whsec_test')
  })

  test('returns undefined fields when env vars absent', () => {
    const cfg = resolveAuthConfig({})
    expect(cfg.clerkPublishableKey).toBeUndefined()
    expect(cfg.clerkSecretKey).toBeUndefined()
    expect(cfg.clerkWebhookSecret).toBeUndefined()
  })
})
