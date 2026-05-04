/**
 * @fileoverview Tests for AnalyticsBridgedLogger decorator.
 */

import type { AnalyticsTracker } from '@t/analytics-types'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { AnalyticsBridgedLogger } from './AnalyticsBridgedLogger.ts'
import { ConsoleLogger } from './ConsoleLogger.ts'

describe('AnalyticsBridgedLogger', () => {
  let consoleLogger: ConsoleLogger
  let mockTracker: AnalyticsTracker
  let bridgedLogger: AnalyticsBridgedLogger

  beforeEach(() => {
    consoleLogger = new ConsoleLogger({ requestId: 'test-123', userId: 'user-456' })
    mockTracker = {
      captureException: vi.fn(),
    }
    bridgedLogger = new AnalyticsBridgedLogger({ logger: consoleLogger, tracker: mockTracker })
  })

  test('delegates all log methods to wrapped logger', () => {
    const consoleSpy = vi.spyOn(consoleLogger, 'debug')
    bridgedLogger.debug({ message: 'test' })
    expect(consoleSpy).toHaveBeenCalledOnce()
  })

  test('info delegates to wrapped logger', () => {
    const infoSpy = vi.spyOn(consoleLogger, 'info')
    bridgedLogger.info({ message: 'info msg' })
    expect(infoSpy).toHaveBeenCalledOnce()
    // info does NOT call tracker
    expect(mockTracker.captureException).not.toHaveBeenCalled()
  })

  test('warn calls tracker.captureException', () => {
    bridgedLogger.warn({ message: 'warning', code: 400 })
    expect(mockTracker.captureException).toHaveBeenCalledOnce()
    const errorArg = mockTracker.captureException.mock.calls[0][0]
    expect(errorArg).toBeInstanceOf(Error)
    expect(errorArg.message).toBe('warning')
  })

  test('error calls tracker.captureException', () => {
    bridgedLogger.error({ message: 'error', code: 500 })
    expect(mockTracker.captureException).toHaveBeenCalledOnce()
    const errorArg = mockTracker.captureException.mock.calls[0][0]
    expect(errorArg).toBeInstanceOf(Error)
    expect(errorArg.message).toBe('error')
  })

  test('fatal calls tracker.captureException', () => {
    bridgedLogger.fatal({ message: 'fatal', code: 999 })
    expect(mockTracker.captureException).toHaveBeenCalledOnce()
    const errorArg = mockTracker.captureException.mock.calls[0][0]
    expect(errorArg).toBeInstanceOf(Error)
    expect(errorArg.message).toBe('fatal')
  })

  test('uses err from payload when present', () => {
    const customError = new Error('custom error')
    bridgedLogger.error({ message: 'error', err: customError })
    const errorArg = (mockTracker.captureException as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(errorArg).toBe(customError)
  })

  test('creates Error from message when no err payload', () => {
    bridgedLogger.warn({ message: 'test warning' })
    expect(mockTracker.captureException).toHaveBeenCalledOnce()
    const errorArg = mockTracker.captureException.mock.calls[0][0]
    expect(errorArg).toBeInstanceOf(Error)
    expect(errorArg.message).toBe('test warning')
  })

  test('passthrough when tracker is null/undefined', () => {
    const loggerNoTracker = new AnalyticsBridgedLogger({ logger: consoleLogger, tracker: null })
    loggerNoTracker.warn({ message: 'test' })
    expect(mockTracker.captureException).not.toHaveBeenCalled()
  })

  test('child returns AnalyticsBridgedLogger with same tracker', () => {
    const child = bridgedLogger.child({ sessionId: 'sess-001' })
    expect(child).toBeInstanceOf(AnalyticsBridgedLogger)
    // @ts-expect-error - accessing private property for test
    expect(child.params.tracker).toBe(mockTracker)
  })

  test('warning method delegates to warn', () => {
    const warnSpy = vi.spyOn(bridgedLogger, 'warn')
    bridgedLogger.warning({ message: 'test warning' })
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  test('string arg with message param creates Error from combined string', () => {
    bridgedLogger.error('connection', 'timed out')
    const errorArg = (mockTracker.captureException as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(errorArg).toBeInstanceOf(Error)
    expect(errorArg.message).toBe('connection timed out')
  })

  test('string arg without message creates Error from string directly', () => {
    bridgedLogger.warn('simple warning')
    const errorArg = (mockTracker.captureException as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(errorArg).toBeInstanceOf(Error)
    expect(errorArg.message).toBe('simple warning')
  })

  test('object arg with message param creates Error with base message only (message param ignored for objects)', () => {
    bridgedLogger.error({ message: 'base error' }, 'additional context')
    const errorArg = (mockTracker.captureException as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(errorArg).toBeInstanceOf(Error)
    // For object args, finalMessage uses arg.message only (the message param is not used)
    expect(errorArg.message).toBe('base error')
  })

  test('object arg with no message field creates Error with empty message fallback', () => {
    bridgedLogger.error({ code: 500 } as never)
    const errorArg = (mockTracker.captureException as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(errorArg).toBeInstanceOf(Error)
    expect(errorArg.message).toBe('Unknown error')
  })

  test('uses anonymous as distinctId when userId is undefined (error)', () => {
    const consoleLoggerNoUser = new ConsoleLogger({ requestId: 'req-1' })
    const bridgedNoUser = new AnalyticsBridgedLogger({
      logger: consoleLoggerNoUser,
      tracker: mockTracker,
    })
    bridgedNoUser.error({ message: 'err' })
    const [, distinctId] = (mockTracker.captureException as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(distinctId).toBe('anonymous')
  })

  test('uses anonymous as distinctId when userId is undefined (fatal)', () => {
    const consoleLoggerNoUser = new ConsoleLogger({ requestId: 'req-1' })
    const bridgedNoUser = new AnalyticsBridgedLogger({
      logger: consoleLoggerNoUser,
      tracker: mockTracker,
    })
    bridgedNoUser.fatal({ message: 'fatal err' })
    const [, distinctId] = (mockTracker.captureException as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(distinctId).toBe('anonymous')
  })
})
