import { dependencyKeys } from '@t/dependency-injection'
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getConfig, getContainer } from './composition'

vi.mock('server-only', () => ({}))

let originalEnv: NodeJS.ProcessEnv

describe('website composition root', () => {
  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.SITE_URL = 'https://example.com'
    process.env.ENVIRONMENT = 'testing'
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('builds the container without throwing when SITE_URL is set', () => {
    expect(() => getContainer()).not.toThrow()
  })

  it('getConfig().siteUrl returns the env value', () => {
    expect(getConfig().siteUrl).toBe('https://example.com')
  })

  it('getLogger() returns a logger with .info, .error, .warn methods', () => {
    const logger = getContainer().resolve(dependencyKeys.global.LOGGER) as Record<string, unknown>
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
  })

  it('container is memoized — calling getContainer() twice returns the same instance', () => {
    const first = getContainer()
    const second = getContainer()
    expect(first).toBe(second)
  })

  it('getConfig() throws when SITE_URL is absent (resolveWebsiteConfig returns undefined)', () => {
    const saved = process.env.SITE_URL
    delete process.env.SITE_URL
    try {
      expect(() => getConfig()).toThrow('Composition root: resolveWebsiteConfig returned undefined')
    } finally {
      if (saved !== undefined) process.env.SITE_URL = saved
    }
  })
})

describe('buildContainer — environment fallback branch', () => {
  // Requires a fresh module instance so the _container singleton is reset.
  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.SITE_URL = 'https://example.com'
    // Intentionally omit ENVIRONMENT so config.system?.environment is undefined,
    // exercising the `?? 'development'` fallback on composition.ts:15.
    delete process.env.ENVIRONMENT
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key'
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('builds container without throwing when ENVIRONMENT is absent (uses development fallback)', async () => {
    const { getContainer: freshGetContainer } = await import('./composition')
    expect(() => freshGetContainer()).not.toThrow()
  })
})
