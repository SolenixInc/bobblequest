/**
 * @fileoverview Verifies child loggers inherit parent context, additional
 * bindings flow through, and mutations on the child do not affect the parent.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { Logger, RequestLogger, createRequestLogger } from '../index.ts'
import { type CapturedStdout, captureStdout, setProductionEnv } from './helpers/captureStdout.ts'

describe('child logger', () => {
  let capture: CapturedStdout
  let env: { restore: () => void }

  beforeEach(() => {
    env = setProductionEnv()
    capture = captureStdout()
  })

  afterEach(() => {
    capture.restore()
    env.restore()
  })

  test('child is a Logger instance and inherits requestId + userId', () => {
    const parent = createRequestLogger({ requestId: 'r1', userId: 'u1' })
    const child = parent.child({ fileName: 'sub.ts' })

    expect(child).toBeInstanceOf(Logger)
    // Preserves concrete subclass (RequestLogger.child via WinstonLogger.child
    // uses `this.constructor`).
    expect(child).toBeInstanceOf(RequestLogger)

    child.info('hi')

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.requestId).toBe('r1')
    expect(line.userId).toBe('u1')
    expect(line.fileName).toBe('sub.ts')
    expect(line.message).toBe('hi')
  })

  test('parent logger is unaffected by child bindings', () => {
    const parent = createRequestLogger({ requestId: 'r1', userId: 'u1' })
    // Create the child then discard — we only want the parent's next log.
    parent.child({ fileName: 'sub.ts' })
    parent.info('p')

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.requestId).toBe('r1')
    expect(line.userId).toBe('u1')
    expect(line.fileName).toBeUndefined()
    expect(line.message).toBe('p')
  })
})
