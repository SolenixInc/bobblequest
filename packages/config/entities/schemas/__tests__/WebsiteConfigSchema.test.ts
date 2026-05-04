import { describe, expect, test } from 'vitest'

import { ConfigValuesSchema } from '../ConfigValuesSchema.ts'
import { WebsiteConfigSchema, resolveWebsiteConfig } from '../WebsiteConfigSchema.ts'

describe('WebsiteConfigSchema', () => {
  test('rejects config with siteUrl only — posthog block is required', () => {
    // The posthog object key is required; only posthog.apiKey within it is optional.
    const result = WebsiteConfigSchema.safeParse({ siteUrl: 'https://example.com' })
    expect(result.success).toBe(false)
  })

  test('rejects invalid siteUrl (not a URL)', () => {
    const result = WebsiteConfigSchema.safeParse({ siteUrl: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  test('rejects missing siteUrl', () => {
    const result = WebsiteConfigSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('accepts valid config with siteUrl and posthog', () => {
    const result = WebsiteConfigSchema.parse({
      siteUrl: 'https://example.com',
      posthog: { apiKey: 'phc_xxx' },
    })
    expect(result.posthog.apiKey).toBe('phc_xxx')
    expect(result.posthog.enabled).toBe(true)
  })

  test('rejects missing posthog block', () => {
    const result = WebsiteConfigSchema.safeParse({ siteUrl: 'https://example.com' })
    expect(result.success).toBe(false)
  })

  test('accepts empty posthog.apiKey (transforms to undefined — no-op tracker)', () => {
    // Empty string is a valid placeholder — transformed to undefined, analytics disabled.
    const result = WebsiteConfigSchema.safeParse({
      siteUrl: 'https://example.com',
      posthog: { apiKey: '' },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.posthog.apiKey).toBeUndefined()
    }
  })

  test('posthog with apiKey but no host parses (host is optional)', () => {
    const result = WebsiteConfigSchema.parse({
      siteUrl: 'https://example.com',
      posthog: { apiKey: 'phc_xxx' },
    })
    expect(result.posthog.apiKey).toBe('phc_xxx')
    expect(result.posthog.host).toBeUndefined()
  })

  test('posthog rejects invalid host URL', () => {
    const result = WebsiteConfigSchema.safeParse({
      siteUrl: 'https://example.com',
      posthog: { apiKey: 'phc_xxx', host: 'not-a-url' },
    })
    expect(result.success).toBe(false)
  })

  test('posthog accepts valid host URL', () => {
    const result = WebsiteConfigSchema.parse({
      siteUrl: 'https://example.com',
      posthog: { apiKey: 'phc_xxx', host: 'https://us.i.posthog.com' },
    })
    expect(result.posthog.host).toBe('https://us.i.posthog.com')
  })

  test('posthog.enabled defaults to true when not provided', () => {
    const result = WebsiteConfigSchema.parse({
      siteUrl: 'https://example.com',
      posthog: { apiKey: 'phc_xxx' },
    })
    expect(result.posthog.enabled).toBe(true)
  })

  test('posthog.enabled can be set to false', () => {
    const result = WebsiteConfigSchema.parse({
      siteUrl: 'https://example.com',
      posthog: { apiKey: 'phc_xxx', enabled: false },
    })
    expect(result.posthog.enabled).toBe(false)
  })
})

describe('resolveWebsiteConfig(env)', () => {
  test('maps SITE_URL -> siteUrl and NEXT_PUBLIC_POSTHOG_KEY -> posthog.apiKey', () => {
    const cfg = resolveWebsiteConfig({
      SITE_URL: 'https://example.com',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_website_key',
    })
    expect(cfg!.siteUrl).toBe('https://example.com')
    expect(cfg!.posthog.apiKey).toBe('phc_website_key')
  })

  test('succeeds when NEXT_PUBLIC_POSTHOG_KEY is absent — apiKey is optional', () => {
    // Template-repo scaffold pattern: apps boot with placeholder env vars.
    const cfg = resolveWebsiteConfig({ SITE_URL: 'https://example.com' })
    expect(cfg!.posthog.apiKey).toBeUndefined()
    expect(cfg!.posthog.enabled).toBe(true) // schema default; caller sets enabled:false when key absent
  })

  test('succeeds when NEXT_PUBLIC_POSTHOG_KEY is empty string — transforms to undefined', () => {
    const cfg = resolveWebsiteConfig({
      SITE_URL: 'https://example.com',
      NEXT_PUBLIC_POSTHOG_KEY: '',
    })
    expect(cfg!.posthog.apiKey).toBeUndefined()
  })

  test('maps NEXT_PUBLIC_POSTHOG_KEY -> posthog.apiKey', () => {
    const cfg = resolveWebsiteConfig({
      SITE_URL: 'https://example.com',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_website_key',
    })
    expect(cfg!.posthog.apiKey).toBe('phc_website_key')
  })

  test('maps NEXT_PUBLIC_POSTHOG_HOST -> posthog.host', () => {
    const cfg = resolveWebsiteConfig({
      SITE_URL: 'https://example.com',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_website_key',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
    })
    expect(cfg!.posthog.host).toBe('https://eu.i.posthog.com')
  })

  test('posthog.enabled defaults to true when NEXT_PUBLIC_POSTHOG_KEY is set', () => {
    const cfg = resolveWebsiteConfig({
      SITE_URL: 'https://example.com',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_website_key',
    })
    expect(cfg!.posthog.enabled).toBe(true)
  })

  test('returns undefined when SITE_URL is missing', () => {
    expect(resolveWebsiteConfig({})).toBeUndefined()
  })

  test('throws when SITE_URL is not a valid URL', () => {
    expect(() =>
      resolveWebsiteConfig({ SITE_URL: 'not-a-url', NEXT_PUBLIC_POSTHOG_KEY: 'phc_key' }),
    ).toThrow()
  })

  test('SKIP_ENV_VALIDATION=1 with no SITE_URL returns stub config (build-time path)', () => {
    const cfg = resolveWebsiteConfig({ SKIP_ENV_VALIDATION: '1' })
    expect(cfg).not.toBeUndefined()
    expect(cfg!.siteUrl).toBe('http://localhost:3002')
    expect(cfg!.posthog.apiKey).toBeUndefined()
  })

  test('SKIP_ENV_VALIDATION=1 stub uses default posthog host', () => {
    const cfg = resolveWebsiteConfig({ SKIP_ENV_VALIDATION: '1' })
    expect(cfg!.posthog.host).toBe('https://us.i.posthog.com')
  })

  test('SKIP_ENV_VALIDATION=1 with SITE_URL still uses real SITE_URL (real env takes precedence)', () => {
    // When both are set, the normal path runs (SITE_URL is truthy → skip the stub branch).
    const cfg = resolveWebsiteConfig({
      SKIP_ENV_VALIDATION: '1',
      SITE_URL: 'https://real.example.com',
    })
    expect(cfg!.siteUrl).toBe('https://real.example.com')
  })

  test('SKIP_ENV_VALIDATION missing and SITE_URL missing → undefined (original behavior preserved)', () => {
    expect(resolveWebsiteConfig({ SKIP_ENV_VALIDATION: '0' })).toBeUndefined()
  })
})

describe('ConfigValuesSchema website branch', () => {
  const base = {
    system: {
      environment: 'testing',
      isLocal: false,
      aiServiceUrl: 'http://localhost:8080',
      metricsAuthToken: 'token',
      systemApiKey: 'key',
      cronSecret: 'test-cron-secret',
    },
    posthog: { apiKey: 'phc_xxx' },
    analytics: { apiKey: 'phc_xxx' },
    auth: {},
    stripe: {
      apiKey: 'sk_test_xxx',
      redirectDomain: 'https://example.com',
      webhookSecret: 'whsec_xxx',
    },
    apple: {
      prodUrl: 'https://buy.itunes.apple.com',
      sandboxUrl: 'https://sandbox.itunes.apple.com',
      sharedSecret: 'secret123',
    },
    appStore: { bundleId: 'com.example.app', environment: 'Production' },
    android: { publisherUrl: 'https://androidpublisher.googleapis.com' },
    revenueCat: {
      apiKey: 'rc_key',
      projectId: 'proj_id',
      nutraforgeEntitlementId: 'ent_id',
      webhookAuthHeader: 'Bearer super-secret',
    },
    redis: {},
  }

  test('website branch is optional — parses without it', () => {
    const result = ConfigValuesSchema.parse(base)
    expect(result.website).toBeUndefined()
  })

  test('website branch with posthog composes into ConfigValuesSchema', () => {
    const result = ConfigValuesSchema.parse({
      ...base,
      website: {
        siteUrl: 'https://example.com',
        posthog: { apiKey: 'phc_site_key', host: 'https://us.i.posthog.com' },
      },
    })
    expect(result.website?.posthog.apiKey).toBe('phc_site_key')
    expect(result.website?.posthog.enabled).toBe(true)
  })

  test('website branch without posthog fails — posthog is required', () => {
    const result = ConfigValuesSchema.safeParse({
      ...base,
      website: { siteUrl: 'https://example.com' },
    })
    expect(result.success).toBe(false)
  })
})
