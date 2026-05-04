/**
 * @fileoverview Verifies LOG_LEVEL filtering. LOG_LEVEL is read at logger
 * construction time (see `winstonLogger.ts#buildConfig`), so we set the env
 * BEFORE calling the factory.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createGlobalLogger } from '../index.ts'
import { type CapturedStdout, captureStdout, setProductionEnv } from './helpers/captureStdout.ts'

describe('LOG_LEVEL filtering', () => {
  let capture: CapturedStdout
  let env: { restore: () => void }

  beforeEach(() => {
    env = setProductionEnv({ LOG_LEVEL: 'warn' })
    capture = captureStdout()
  })

  afterEach(() => {
    capture.restore()
    env.restore()
  })

  test('debug and info are suppressed, warn and error emit exactly one line', () => {
    const logger = createGlobalLogger('file.ts')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(capture.lines).toHaveLength(2)
    const levels = capture.lines.map((l) => l.level)
    expect(levels).toContain('warn')
    expect(levels).toContain('error')
    expect(levels).not.toContain('debug')
    expect(levels).not.toContain('info')
  })
})
