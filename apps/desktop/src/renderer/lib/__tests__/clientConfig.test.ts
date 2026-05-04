/**
 * Tests for resolveDesktopClientConfig.
 *
 * Covers all branches of the validation logic:
 *   - valid minimal env (trpc url only)
 *   - valid full env
 *   - missing/invalid required field throws
 *   - optional fields absent → undefined defaults
 */
import { describe, expect, it } from 'vitest'
import { resolveDesktopClientConfig } from '../clientConfig'

const VALID_MINIMAL: Record<string, string | undefined> = {
  VITE_CLERK_PUBLISHABLE_KEY: undefined,
  VITE_API_URL: 'http://localhost:3000/trpc',
  VITE_POSTHOG_KEY: undefined,
  VITE_POSTHOG_HOST: undefined,
  VITE_REVENUECAT_PUBLIC_API_KEY: undefined,
  VITE_ENVIRONMENT: undefined,
}

const VALID_FULL: Record<string, string | undefined> = {
  VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
  VITE_API_URL: 'https://api.example.com/trpc',
  VITE_POSTHOG_KEY: 'phc_xyz',
  VITE_POSTHOG_HOST: 'https://eu.posthog.com',
  VITE_REVENUECAT_PUBLIC_API_KEY: 'rc_pub_key',
  VITE_ENVIRONMENT: 'production',
}

describe('resolveDesktopClientConfig', () => {
  it('parses a minimal valid env without throwing', () => {
    const config = resolveDesktopClientConfig(VALID_MINIMAL)
    expect(config).toBeDefined()
    expect(config.trpc.url).toBe('http://localhost:3000/trpc')
  })

  it('parses a full env and maps every field', () => {
    const config = resolveDesktopClientConfig(VALID_FULL)
    expect(config.clerk.publishableKey).toBe('pk_test_abc')
    expect(config.trpc.url).toBe('https://api.example.com/trpc')
    expect(config.posthog.key).toBe('phc_xyz')
    expect(config.posthog.host).toBe('https://eu.posthog.com')
    expect(config.revenueCat.publicApiKey).toBe('rc_pub_key')
    expect(config.environment).toBe('production')
  })

  it('optional clerk key absent → publishableKey is undefined', () => {
    const config = resolveDesktopClientConfig({
      ...VALID_MINIMAL,
      VITE_CLERK_PUBLISHABLE_KEY: undefined,
    })
    expect(config.clerk.publishableKey).toBeUndefined()
  })

  it('optional posthog key absent → posthog.key is undefined', () => {
    const config = resolveDesktopClientConfig(VALID_MINIMAL)
    expect(config.posthog.key).toBeUndefined()
  })

  it('optional revenuecat key absent → revenueCat.publicApiKey is undefined', () => {
    const config = resolveDesktopClientConfig(VALID_MINIMAL)
    expect(config.revenueCat.publicApiKey).toBeUndefined()
  })

  it('throws with a descriptive message when trpc url is invalid', () => {
    expect(() =>
      resolveDesktopClientConfig({ ...VALID_MINIMAL, VITE_API_URL: 'not-a-url' }),
    ).toThrow('DesktopClientConfig validation failed')
  })

  it('throws when VITE_ENVIRONMENT has an invalid value', () => {
    expect(() =>
      resolveDesktopClientConfig({ ...VALID_MINIMAL, VITE_ENVIRONMENT: 'staging' }),
    ).toThrow()
  })

  it('accepts testing as a valid environment value', () => {
    const config = resolveDesktopClientConfig({ ...VALID_MINIMAL, VITE_ENVIRONMENT: 'testing' })
    expect(config.environment).toBe('testing')
  })

  it('accepts development as a valid environment value', () => {
    const config = resolveDesktopClientConfig({ ...VALID_MINIMAL, VITE_ENVIRONMENT: 'development' })
    expect(config.environment).toBe('development')
  })

  it('empty string posthog key is normalized to undefined', () => {
    const config = resolveDesktopClientConfig({ ...VALID_MINIMAL, VITE_POSTHOG_KEY: '' })
    expect(config.posthog.key).toBeUndefined()
  })
})
