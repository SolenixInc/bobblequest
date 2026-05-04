/**
 * @fileoverview Tests for createBrowserLogger factory.
 */

import type { AnalyticsTracker } from '@t/analytics-types'
import { describe, expect, test, vi } from 'vitest'

// Each test gets a fresh module (fresh singleton) via vi.resetModules + dynamic import.
// ConsoleLogger and AnalyticsBridgedLogger must come from the SAME module reset so
// class identity matches for instanceof checks.
async function freshFactory() {
  vi.resetModules()
  const [factory, consoleLoggerMod, bridgedLoggerMod] = await Promise.all([
    import('./createBrowserLogger.ts'),
    import('../infrastructure/ConsoleLogger.ts'),
    import('../infrastructure/AnalyticsBridgedLogger.ts'),
  ])
  return {
    createBrowserLogger: factory.createBrowserLogger,
    getLogger: factory.getLogger,
    ConsoleLogger: consoleLoggerMod.ConsoleLogger,
    AnalyticsBridgedLogger: bridgedLoggerMod.AnalyticsBridgedLogger,
  }
}

// Dynamic imports via vi.resetModules are slow under load; each test gets 15s.
const TIMEOUT = 15_000

describe('createBrowserLogger', () => {
  test(
    'returns ConsoleLogger when no analytics provided',
    async () => {
      const { createBrowserLogger, ConsoleLogger } = await freshFactory()
      const logger = createBrowserLogger()
      expect(logger).toBeInstanceOf(ConsoleLogger)
      expect(logger.requestId).toBe('browser-global')
    },
    TIMEOUT,
  )

  test(
    'returns AnalyticsBridgedLogger when analytics provided',
    async () => {
      const { createBrowserLogger, AnalyticsBridgedLogger } = await freshFactory()
      const mockTracker = { captureException: vi.fn() } as unknown as AnalyticsTracker
      const logger = createBrowserLogger({ analytics: mockTracker })
      expect(logger).toBeInstanceOf(AnalyticsBridgedLogger)
      // @ts-expect-error - accessing private property for test
      expect(logger.params.tracker).toBe(mockTracker)
    },
    TIMEOUT,
  )

  test(
    'returns same instance on subsequent calls (singleton)',
    async () => {
      const { createBrowserLogger } = await freshFactory()
      const logger1 = createBrowserLogger()
      const logger2 = createBrowserLogger()
      expect(logger1).toBe(logger2)
    },
    TIMEOUT,
  )

  test(
    'getLogger returns existing singleton',
    async () => {
      const { createBrowserLogger, getLogger } = await freshFactory()
      const logger1 = createBrowserLogger()
      const logger2 = getLogger()
      expect(logger1).toBe(logger2)
    },
    TIMEOUT,
  )

  test(
    'getLogger creates ConsoleLogger when none exists',
    async () => {
      const { getLogger, ConsoleLogger } = await freshFactory()
      const logger = getLogger()
      expect(logger).toBeInstanceOf(ConsoleLogger)
    },
    TIMEOUT,
  )

  test(
    'subsequent getLogger calls return same instance',
    async () => {
      const { getLogger } = await freshFactory()
      const logger1 = getLogger()
      const logger2 = getLogger()
      expect(logger1).toBe(logger2)
    },
    TIMEOUT,
  )

  test(
    'second createBrowserLogger call with different analytics returns same singleton',
    async () => {
      const { createBrowserLogger, AnalyticsBridgedLogger } = await freshFactory()

      const tracker1 = { captureException: vi.fn() } as unknown as AnalyticsTracker
      const tracker2 = { captureException: vi.fn() } as unknown as AnalyticsTracker

      const logger1 = createBrowserLogger({ analytics: tracker1 })
      const logger2 = createBrowserLogger({ analytics: tracker2 })

      expect(logger1).toBeInstanceOf(AnalyticsBridgedLogger)
      // @ts-expect-error - accessing private property
      expect(logger1.params.tracker).toBe(tracker1)

      // singleton — second call returns same instance
      expect(logger2).toBe(logger1)
      // @ts-expect-error - accessing private property
      expect(logger2.params.tracker).toBe(tracker1)
    },
    TIMEOUT,
  )
})
