import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createLogger, createRequestLogger } from '../index.ts'
import { type CapturedStdout, captureStdout, setProductionEnv } from './helpers/captureStdout.ts'

describe('createLogger / createRequestLogger branch coverage', () => {
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

  test('createLogger({ requestId }) uses the provided requestId (covers ?? branch)', () => {
    const logger = createLogger({ requestId: 'req-123' })
    logger.info('msg')
    expect(capture.lines[0]?.requestId).toBe('req-123')
  })

  test('createRequestLogger with explicit requestId emits correct requestId', () => {
    const logger = createRequestLogger({ requestId: 'req-456', userId: 'u1', fileName: 'f.ts' })
    logger.info('msg')
    expect(capture.lines[0]?.requestId).toBe('req-456')
  })
})
