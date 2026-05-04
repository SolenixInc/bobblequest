import { describe, expect, test } from 'vitest'

import { AnalyticsConfigSchema, resolveAnalyticsConfig } from '../AnalyticsConfigSchema.ts'

describe('AnalyticsConfigSchema', () => {
  test('rejects empty object — apiKey is required', () => {
    const result = AnalyticsConfigSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('rejects empty-string apiKey', () => {
    const result = AnalyticsConfigSchema.safeParse({ apiKey: '' })
    expect(result.success).toBe(false)
  })

  test('accepts { apiKey } and applies enabled: true default', () => {
    const parsed = AnalyticsConfigSchema.parse({ apiKey: 'phc_xxx' })
    expect(parsed.apiKey).toBe('phc_xxx')
    expect(parsed.enabled).toBe(true)
  })

  test('rejects invalid host (not a URL)', () => {
    const result = AnalyticsConfigSchema.safeParse({
      apiKey: 'phc_xxx',
      host: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  test('accepts valid host URL (https://us.posthog.com)', () => {
    const parsed = AnalyticsConfigSchema.parse({
      apiKey: 'phc_xxx',
      host: 'https://us.posthog.com',
    })
    expect(parsed.host).toBe('https://us.posthog.com')
  })

  test('accepts optional personalApiKey', () => {
    const parsed = AnalyticsConfigSchema.parse({
      apiKey: 'phc_xxx',
      personalApiKey: 'phx_server_side_key',
    })
    expect(parsed.personalApiKey).toBe('phx_server_side_key')
  })
})

describe('resolveAnalyticsConfig(env)', () => {
  test('maps POSTHOG_API_KEY -> apiKey', () => {
    const cfg = resolveAnalyticsConfig({
      POSTHOG_API_KEY: 'phc_from_env',
    })
    expect(cfg.apiKey).toBe('phc_from_env')
  })

  test('maps POSTHOG_PERSONAL_API_KEY -> personalApiKey', () => {
    const cfg = resolveAnalyticsConfig({
      POSTHOG_API_KEY: 'phc_from_env',
      POSTHOG_PERSONAL_API_KEY: 'phx_from_env',
    })
    expect(cfg.personalApiKey).toBe('phx_from_env')
  })

  test('maps POSTHOG_HOST -> host', () => {
    const cfg = resolveAnalyticsConfig({
      POSTHOG_API_KEY: 'phc_from_env',
      POSTHOG_HOST: 'https://eu.posthog.com',
    })
    expect(cfg.host).toBe('https://eu.posthog.com')
  })

  test("coerces POSTHOG_ENABLED='false' -> enabled: false", () => {
    const cfg = resolveAnalyticsConfig({
      POSTHOG_API_KEY: 'phc_from_env',
      POSTHOG_ENABLED: 'false',
    })
    expect(cfg.enabled).toBe(false)
  })

  test('defaults enabled to true when POSTHOG_ENABLED is unset', () => {
    const cfg = resolveAnalyticsConfig({
      POSTHOG_API_KEY: 'phc_from_env',
    })
    expect(cfg.enabled).toBe(true)
  })

  test('POSTHOG_ENABLED="true" -> enabled: true', () => {
    const cfg = resolveAnalyticsConfig({
      POSTHOG_API_KEY: 'phc_from_env',
      POSTHOG_ENABLED: 'true',
    })
    expect(cfg.enabled).toBe(true)
  })
})
