/**
 * Composition root tests for apps/desktop main process.
 *
 * Validates that buildContainer() correctly wires CONFIG and LOGGER under
 * valid env, and that an invalid ENVIRONMENT value (outside the allowed enum)
 * causes a clear Zod parse error.
 *
 * Note: All auth fields in DesktopConfigValuesSchema are optional — a missing
 * CLERK_PUBLISHABLE_KEY is valid by design. The schema's hard failure path is
 * an invalid ENVIRONMENT value (e.g. "staging" is not in the enum).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Reset module registry before each test so the lazy _container singleton is
// freshly created for each test run in isolation.
beforeEach(() => {
  vi.resetModules()
  // ConfigValuesSchema requires posthog.apiKey with no default; stub it for
  // every test so buildContainer's schema parse succeeds. Individual tests
  // can still override ENVIRONMENT (etc.) with vi.stubEnv as needed.
  vi.stubEnv('POSTHOG_API_KEY', 'test-key')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// vi.resetModules() + dynamic imports are slow under parallel monorepo test load.
// 30 s matches observed worst-case under turbo parallel execution; global config is 60 s.
const TIMEOUT = 30_000

describe('buildContainer', () => {
  it(
    'resolves CONFIG without throwing when env is valid',
    async () => {
      vi.stubEnv('ENVIRONMENT', 'testing')

      const { buildContainer } = await import('../composition')
      const { dependencyKeys } = await import('@t/dependency-injection')

      const container = buildContainer()
      const config = container.resolve(dependencyKeys.global.CONFIG)

      expect(config).toBeDefined()
      expect(config.system.environment).toBe('testing')
    },
    TIMEOUT,
  )

  it(
    'resolves LOGGER and logger.info does not throw',
    async () => {
      vi.stubEnv('ENVIRONMENT', 'testing')

      const { buildContainer } = await import('../composition')
      const { dependencyKeys } = await import('@t/dependency-injection')

      const container = buildContainer()
      const logger = container.resolve(dependencyKeys.global.LOGGER)

      expect(logger).toBeDefined()
      expect(() =>
        logger.info({ message: 'test log from composition.test', context: 'vitest' }),
      ).not.toThrow()
    },
    TIMEOUT,
  )

  it(
    'throws a Zod parse error when ENVIRONMENT has an invalid value',
    async () => {
      vi.stubEnv('ENVIRONMENT', 'staging') // not in DesktopConfigValuesSchema enum

      const { buildContainer } = await import('../composition')
      expect(() => buildContainer()).toThrow()
    },
    TIMEOUT,
  )

  it(
    'getContainer returns the same instance on repeated calls',
    async () => {
      vi.stubEnv('ENVIRONMENT', 'testing')

      const { getContainer } = await import('../composition')
      const a = getContainer()
      const b = getContainer()

      expect(a).toBe(b)
    },
    TIMEOUT,
  )
})
