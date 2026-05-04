/**
 * @fileoverview Tests for ConsoleLogger structured output.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ConsoleLogger } from './ConsoleLogger.ts'

describe('ConsoleLogger', () => {
  let consoleSpy: {
    debug: vi.Mock
    info: vi.Mock
    warn: vi.Mock
    error: vi.Mock
  }

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  test('debug -> console.debug with structured output', () => {
    const logger = new ConsoleLogger({ requestId: 'test-123', userId: 'user-456' })
    logger.debug({ message: 'test', foo: 'bar' })

    expect(consoleSpy.debug).toHaveBeenCalledOnce()
    const arg = consoleSpy.debug.mock.calls[0][0]
    expect(arg).toMatchObject({
      message: 'test',
      foo: 'bar',
      timestamp: expect.any(String),
      level: 'debug',
      context: {
        requestId: 'test-123',
        userId: 'user-456',
      },
    })
  })

  test('info -> console.info with structured output', () => {
    const logger = new ConsoleLogger()
    logger.info({ message: 'info test', count: 5 })

    expect(consoleSpy.info).toHaveBeenCalledOnce()
    const arg = consoleSpy.info.mock.calls[0][0]
    expect(arg).toMatchObject({
      message: 'info test',
      count: 5,
      timestamp: expect.any(String),
      level: 'info',
      context: {
        requestId: 'rn-global',
        userId: undefined,
      },
    })
  })

  test('warn -> console.warn with structured output', () => {
    const logger = new ConsoleLogger()
    logger.warn({ message: 'warning', severity: 'high' })

    expect(consoleSpy.warn).toHaveBeenCalledOnce()
    const arg = consoleSpy.warn.mock.calls[0][0]
    expect(arg).toMatchObject({
      message: 'warning',
      severity: 'high',
      timestamp: expect.any(String),
      level: 'warn',
      context: {
        requestId: 'rn-global',
        userId: undefined,
      },
    })
  })

  test('error -> console.error with structured output', () => {
    const logger = new ConsoleLogger()
    logger.error({ message: 'error test', code: 500 })

    expect(consoleSpy.error).toHaveBeenCalledOnce()
    const arg = consoleSpy.error.mock.calls[0][0]
    expect(arg).toMatchObject({
      message: 'error test',
      code: 500,
      timestamp: expect.any(String),
      level: 'error',
      context: {
        requestId: 'rn-global',
        userId: undefined,
      },
    })
  })

  test('fatal -> console.error with fatal level', () => {
    const logger = new ConsoleLogger()
    logger.fatal({ message: 'fatal test', code: 999 })

    expect(consoleSpy.error).toHaveBeenCalledOnce()
    const arg = consoleSpy.error.mock.calls[0][0]
    expect(arg).toMatchObject({
      message: 'fatal test',
      code: 999,
      timestamp: expect.any(String),
      level: 'fatal',
      context: {
        requestId: 'rn-global',
        userId: undefined,
      },
    })
  })

  test('child creates new logger with merged context', () => {
    const parent = new ConsoleLogger({ requestId: 'parent-123', userId: 'user-456' })
    const child = parent.child({ userId: 'user-789', sessionId: 'sess-001' })

    expect(child).toBeInstanceOf(ConsoleLogger)
    expect(child.requestId).toBe('parent-123')
    expect(child.userId).toBe('user-789')

    child.debug({ message: 'child log' })
    expect(consoleSpy.debug).toHaveBeenCalledOnce()
    const arg = consoleSpy.debug.mock.calls[0][0]
    expect(arg).toMatchObject({
      message: 'child log',
      timestamp: expect.any(String),
      level: 'debug',
      context: {
        requestId: 'parent-123',
        userId: 'user-789',
      },
      sessionId: 'sess-001',
    })
  })

  test('string message argument is handled correctly', () => {
    const logger = new ConsoleLogger()
    logger.info('plain message', 'additional context')

    expect(consoleSpy.info).toHaveBeenCalledOnce()
    const arg = consoleSpy.info.mock.calls[0][0]
    expect(arg).toMatchObject({
      message: 'plain message additional context',
      timestamp: expect.any(String),
      level: 'info',
      context: {
        requestId: 'rn-global',
        userId: undefined,
      },
    })
  })

  test('string message with only first argument', () => {
    const logger = new ConsoleLogger()
    logger.info('plain message')

    expect(consoleSpy.info).toHaveBeenCalledOnce()
    const arg = consoleSpy.info.mock.calls[0][0]
    expect(arg).toMatchObject({
      message: 'plain message',
      timestamp: expect.any(String),
      level: 'info',
      context: {
        requestId: 'rn-global',
        userId: undefined,
      },
    })
  })

  test('object arg with no message field produces undefined message', () => {
    const logger = new ConsoleLogger()
    logger.debug({ code: 42 } as never)

    expect(consoleSpy.debug).toHaveBeenCalledOnce()
    const arg = consoleSpy.debug.mock.calls[0][0]
    // arg.message is undefined (no message field in input, ternary returns arg.message = undefined)
    expect(arg.message).toBeUndefined()
    expect(arg.code).toBe(42)
  })

  test('object arg with message param concatenates message and param', () => {
    const logger = new ConsoleLogger()
    logger.debug({ message: 'base msg', code: 1 }, 'extra context')

    expect(consoleSpy.debug).toHaveBeenCalledOnce()
    const arg = consoleSpy.debug.mock.calls[0][0]
    expect(arg.message).toBe('base msg extra context')
  })
})
