/**
 * @fileoverview Verifies the redaction winston format masks every key listed
 * in DEFAULT_REDACT_PATHS across top-level and nested positions and leaves
 * non-sensitive fields untouched.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createGlobalLogger } from '../index.ts'
import { type CapturedStdout, captureStdout, setProductionEnv } from './helpers/captureStdout.ts'

describe('PII redaction', () => {
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

  test('password is redacted, non-sensitive field passes through', () => {
    const logger = createGlobalLogger('file.ts')
    logger.info({ message: 'x', metadata: { password: 'hunter2', userId: 42 } }, '')

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.password).toBe('[REDACTED]')
    expect(line.userId).toBe(42)
  })

  test('headers.authorization and headers.cookie are redacted (nested)', () => {
    const logger = createGlobalLogger('file.ts')
    logger.info(
      {
        message: 'x',
        metadata: { headers: { authorization: 'Bearer abc', cookie: 'sid=xyz', 'x-trace': 't1' } },
      },
      '',
    )

    expect(capture.lines).toHaveLength(1)
    const headers = capture.lines[0]?.headers as Record<string, unknown>
    expect(headers.authorization).toBe('[REDACTED]')
    expect(headers.cookie).toBe('[REDACTED]')
    expect(headers['x-trace']).toBe('t1')
  })

  test('user.email is redacted (nested)', () => {
    const logger = createGlobalLogger('file.ts')
    logger.info({ message: 'x', metadata: { user: { email: 'a@b.com', handle: 'alice' } } }, '')

    expect(capture.lines).toHaveLength(1)
    const user = capture.lines[0]?.user as Record<string, unknown>
    expect(user.email).toBe('[REDACTED]')
    expect(user.handle).toBe('alice')
  })

  test('token / accessToken / refreshToken / apiKey all redacted', () => {
    const logger = createGlobalLogger('file.ts')
    logger.info(
      { message: 'x', metadata: { token: 't', accessToken: 'a', refreshToken: 'r', apiKey: 'k' } },
      '',
    )

    expect(capture.lines).toHaveLength(1)
    const line = capture.lines[0]!
    expect(line.token).toBe('[REDACTED]')
    expect(line.accessToken).toBe('[REDACTED]')
    expect(line.refreshToken).toBe('[REDACTED]')
    expect(line.apiKey).toBe('[REDACTED]')
  })
})
