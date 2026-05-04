/**
 * @fileoverview Verifies the JSON line shape emitted by each log level.
 * Asserts presence of standard fields (message, level, timestamp, service,
 * environment, version, fileName, requestId) for a GlobalLogger constructed
 * via the string-form factory.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { VERSION, createGlobalLogger } from '../index.ts'
import { type CapturedStdout, captureStdout, setProductionEnv } from './helpers/captureStdout.ts'

describe('log line JSON shape', () => {
  let capture: CapturedStdout
  let env: { restore: () => void }

  beforeEach(() => {
    env = setProductionEnv({ SERVICE_NAME: 'core-api' })
    capture = captureStdout()
  })

  afterEach(() => {
    capture.restore()
    env.restore()
  })

  test('info level emits standard fields', () => {
    const logger = createGlobalLogger('file.ts')
    logger.info('hello')

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.message).toBe('hello')
    expect(line.level).toBe('info')
    expect(typeof line.timestamp).toBe('string')
    expect(line.service).toBe('core-api')
    expect(line.environment).toBe('testing')
    expect(line.version).toBe(VERSION)
    expect(line.fileName).toBe('file.ts')
    expect(line.requestId).toBe('global')
  })

  test('debug level emits level=debug', () => {
    const logger = createGlobalLogger('file.ts')
    logger.debug('d')

    expect(capture.lines).toHaveLength(1)
    expect(capture.lines[0]?.level).toBe('debug')
    expect(capture.lines[0]?.message).toBe('d')
  })

  test('warn level emits level=warn', () => {
    const logger = createGlobalLogger('file.ts')
    logger.warn('w')

    expect(capture.lines).toHaveLength(1)
    expect(capture.lines[0]?.level).toBe('warn')
  })

  test('error level emits level=error', () => {
    const logger = createGlobalLogger('file.ts')
    logger.error('e')

    expect(capture.lines).toHaveLength(1)
    expect(capture.lines[0]?.level).toBe('error')
  })

  test('fatal level retains fatal marker per rewrite spec', () => {
    const logger = createGlobalLogger('file.ts')
    logger.fatal('f')

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.message).toBe('f')
    // Per `winstonLogger.ts#logMessage`: tag='fatal' sets logData.severity='fatal'
    // (not `level`, which winston clobbers with the call-site level arg via
    // Object.assign). Wire-level is ERROR; severity preserves the fatal marker.
    expect(line.level).toBe('error')
    expect(line.severity).toBe('fatal')
  })
})
