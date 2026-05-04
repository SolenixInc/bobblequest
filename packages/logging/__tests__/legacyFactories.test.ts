/**
 * @fileoverview Verifies the factory functions, instanceof discrimination,
 * the .warning() alias, and the single-arg-object fallback call shape used
 * by downstream packages.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { GlobalLogger, RequestLogger, createGlobalLogger, createRequestLogger } from '../index.ts'
import { type CapturedStdout, captureStdout, setProductionEnv } from './helpers/captureStdout.ts'

describe('factory + legacy call shapes', () => {
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

  test('createGlobalLogger(string) returns GlobalLogger with fileName', () => {
    const logger = createGlobalLogger('file.ts')
    expect(logger).toBeInstanceOf(GlobalLogger)

    logger.info('hi')
    expect(capture.lines).toHaveLength(1)
    expect(capture.lines[0]?.fileName).toBe('file.ts')
  })

  test('createGlobalLogger({}) returns GlobalLogger without throwing', () => {
    const logger = createGlobalLogger({})
    expect(logger).toBeInstanceOf(GlobalLogger)

    logger.info('hi')
    expect(capture.lines).toHaveLength(1)
    expect(capture.lines[0]?.requestId).toBe('global')
  })

  test('createGlobalLogger() (no args) defaults requestId to "global"', () => {
    const logger = createGlobalLogger()
    expect(logger).toBeInstanceOf(GlobalLogger)

    logger.info('hi')
    expect(capture.lines).toHaveLength(1)
    expect(capture.lines[0]?.requestId).toBe('global')
  })

  test('createRequestLogger returns RequestLogger and is NOT a GlobalLogger', () => {
    const logger = createRequestLogger({ requestId: 'x' })
    expect(logger).toBeInstanceOf(RequestLogger)
    expect(logger).not.toBeInstanceOf(GlobalLogger)
  })

  test('.warning(payload, "") emits at level=warn and preserves metadata', () => {
    const logger = createGlobalLogger('file.ts')
    logger.warning({ message: 'w', metadata: { k: 1 } }, '')

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.level).toBe('warn')
    expect(line.message).toBe('w')
    expect(line.k).toBe(1)
  })

  test('single-argument payload fallback: logger.error(payload) works', () => {
    const logger = createGlobalLogger('file.ts')
    logger.error({ message: 'oops', metadata: { code: 500 } })

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.level).toBe('error')
    expect(line.message).toBe('oops')
    expect(line.code).toBe(500)
  })

  test('second-arg string overrides payload.message', () => {
    const logger = createGlobalLogger('file.ts')
    logger.info({ message: 'from-payload', metadata: { a: 1 } }, 'from-arg')

    expect(capture.lines).toHaveLength(1)
    expect(capture.lines[0]?.message).toBe('from-arg')
  })
})
