/**
 * @fileoverview Tests for redactors - ported verbatim from server logging tests.
 */

import { describe, expect, test } from 'vitest'
import {
  DEFAULT_REDACT_PATHS,
  REDACTION_CENSOR,
  buildRedactConfig,
  redactFormat,
} from './redactors.ts'

describe('PII redaction', () => {
  test('password is redacted, non-sensitive field passes through', () => {
    const format = redactFormat()
    const result = format({ message: 'x', password: 'hunter2', userId: 42 })
    expect(result.password).toBe('[REDACTED]')
    expect(result.userId).toBe(42)
  })

  test('headers.authorization and headers.cookie are redacted (nested)', () => {
    const format = redactFormat()
    const result = format({
      message: 'x',
      headers: { authorization: 'Bearer abc', cookie: 'sid=xyz', 'x-trace': 't1' },
    })
    const headers = result.headers as Record<string, unknown>
    expect(headers.authorization).toBe('[REDACTED]')
    expect(headers.cookie).toBe('[REDACTED]')
    expect(headers['x-trace']).toBe('t1')
  })

  test('user.email is redacted (nested)', () => {
    const format = redactFormat()
    const result = format({ message: 'x', user: { email: 'a@b.com', handle: 'alice' } })
    const user = result.user as Record<string, unknown>
    expect(user.email).toBe('[REDACTED]')
    expect(user.handle).toBe('alice')
  })

  test('token / accessToken / refreshToken / apiKey all redacted', () => {
    const format = redactFormat()
    const result = format({
      message: 'x',
      token: 't',
      accessToken: 'a',
      refreshToken: 'r',
      apiKey: 'k',
    })
    expect(result.token).toBe('[REDACTED]')
    expect(result.accessToken).toBe('[REDACTED]')
    expect(result.refreshToken).toBe('[REDACTED]')
    expect(result.apiKey).toBe('[REDACTED]')
  })

  test('buildRedactConfig deduplicates paths', () => {
    const config = buildRedactConfig(['password', 'password', 'token'])
    expect(config.paths).toEqual([
      'password',
      'passwd',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'api_key',
      'secret',
      'authorization',
      'Authorization',
      'cookie',
      'Cookie',
      'set-cookie',
      'email',
    ])
  })

  test('buildRedactConfig adds extra paths', () => {
    const config = buildRedactConfig(['customField', 'another'])
    expect(config.paths).toContain('customField')
    expect(config.paths).toContain('another')
    expect(config.paths).toContain('password') // still has defaults
  })

  test('REDACTION_CENSOR constant', () => {
    expect(REDACTION_CENSOR).toBe('[REDACTED]')
  })

  test('DEFAULT_REDACT_PATHS constant', () => {
    expect(DEFAULT_REDACT_PATHS).toContain('password')
    expect(DEFAULT_REDACT_PATHS).toContain('email')
    expect(DEFAULT_REDACT_PATHS).toContain('authorization')
  })

  test('symbol-keyed properties are preserved verbatim', () => {
    const format = redactFormat()
    const sym = Symbol('testSym')
    const obj = { message: 'test', [sym]: 'symbol-value' }
    const result = format(obj) as Record<string | symbol, unknown>
    expect(result[sym]).toBe('symbol-value')
    expect(result.message).toBe('test')
  })

  test('array values are recursively redacted', () => {
    const format = redactFormat()
    const result = format({ message: 'x', tokens: ['a', 'b'] })
    // Array values that are non-sensitive strings pass through
    expect((result as Record<string, unknown>).tokens).toEqual(['a', 'b'])
  })

  test('null and undefined field values pass through unchanged', () => {
    const format = redactFormat()
    const result = format({ message: 'x', nullField: null, undefinedField: undefined })
    expect((result as Record<string, unknown>).nullField).toBeNull()
    expect((result as Record<string, unknown>).undefinedField).toBeUndefined()
  })

  test('Error-valued fields pass through unchanged', () => {
    const format = redactFormat()
    const err = new Error('test error')
    const result = format({ message: 'x', err })
    expect((result as Record<string, unknown>).err).toBe(err)
  })
})
