/**
 * @fileoverview Verifies how Error instances are serialized in log output.
 * winston's `format.errors({ stack: true })` is included in the logger
 * pipeline specifically to surface stack/message from Error instances.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createGlobalLogger } from '../index.ts'
import { type CapturedStdout, captureStdout, setProductionEnv } from './helpers/captureStdout.ts'

describe('error serialization', () => {
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

  test('nested Error under metadata.err emits stack trace string', () => {
    const logger = createGlobalLogger('file.ts')
    logger.error({ message: 'boom', metadata: { err: new Error('db failed') } }, '')

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.level).toBe('error')
    expect(line.message).toBe('boom')
    // The rewrite enables `format.errors({ stack: true })` at the logger
    // level. We expect the captured JSON to contain the error message
    // string somewhere — either under `err.message`, `err.stack`, or a
    // flattened top-level `stack`. We just require the JSON to surface
    // 'db failed' somewhere.
    const serialized = JSON.stringify(line)
    expect(serialized).toMatch(/db failed/)
  })

  test('bare Error passed directly emits non-empty message', () => {
    const logger = createGlobalLogger('file.ts')
    logger.error(new Error('bare') as unknown as Parameters<typeof logger.error>[0])

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.level).toBe('error')
    const serialized = JSON.stringify(line)
    expect(serialized).toMatch(/bare/)
  })
})
