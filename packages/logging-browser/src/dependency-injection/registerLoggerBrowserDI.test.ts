/**
 * @fileoverview Tests for registerLoggerBrowserDI - wires Logger into the DI container.
 */

import type { AnalyticsTracker } from '@t/analytics-types'
import { createContainer, dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging-types'
import type { LogContext } from '@t/logging-types'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { AnalyticsBridgedLogger } from '../infrastructure/AnalyticsBridgedLogger.ts'
import { ConsoleLogger } from '../infrastructure/ConsoleLogger.ts'
import { LOGGER_DEPENDENCY_KEY, registerLoggerBrowserDI } from './registerLoggerBrowserDI.ts'

describe('registerLoggerBrowserDI', () => {
  let container: ReturnType<typeof createContainer>

  beforeEach(() => {
    container = createContainer()
  })

  test('registers Logger key that matches global LOGGER key', () => {
    expect(LOGGER_DEPENDENCY_KEY).toBe(dependencyKeys.global.LOGGER)
  })

  test('creates ConsoleLogger when no analytics', () => {
    registerLoggerBrowserDI(container, {})
    const logger = container.resolve(LOGGER_DEPENDENCY_KEY) as Logger
    expect(logger).toBeInstanceOf(ConsoleLogger)
    expect(logger.requestId).toBe('browser-global')
  })

  test('wraps in AnalyticsBridgedLogger when analytics provided', () => {
    const mockTracker: AnalyticsTracker = {
      captureException: vi.fn(),
    } as unknown as AnalyticsTracker
    registerLoggerBrowserDI(container, { analytics: mockTracker })
    const logger = container.resolve(LOGGER_DEPENDENCY_KEY) as Logger
    expect(logger).toBeInstanceOf(AnalyticsBridgedLogger)
    // @ts-expect-error - accessing private property for test
    expect(logger.params.tracker).toBe(mockTracker)
  })

  test('uses provided context', () => {
    const context: LogContext = { requestId: 'custom-123', userId: 'user-456' }
    registerLoggerBrowserDI(container, { context })
    const logger = container.resolve(LOGGER_DEPENDENCY_KEY) as Logger
    expect(logger.requestId).toBe('custom-123')
    expect(logger.userId).toBe('user-456')
  })

  test('returns same instance on multiple resolves (singleton)', () => {
    registerLoggerBrowserDI(container, {})
    const logger1 = container.resolve(LOGGER_DEPENDENCY_KEY) as Logger
    const logger2 = container.resolve(LOGGER_DEPENDENCY_KEY) as Logger
    expect(logger1).toBe(logger2)
  })

  test('passes through analytics options to factory', () => {
    const mockTracker: AnalyticsTracker = {
      captureException: vi.fn(),
    } as unknown as AnalyticsTracker
    registerLoggerBrowserDI(container, { analytics: mockTracker })
    const logger = container.resolve(LOGGER_DEPENDENCY_KEY) as Logger
    expect(logger).toBeInstanceOf(AnalyticsBridgedLogger)
    logger.warn({ message: 'test' })
    expect(mockTracker.captureException).toHaveBeenCalled()
  })
})
