/**
 * @fileoverview Tests for errorSerializer - ported verbatim from server logging tests.
 */

import { describe, expect, test } from 'vitest'
import { errorSerializerFormat } from './errorSerializer.ts'

describe('error serialization', () => {
  test('nested Error under metadata.err emits stack trace string', () => {
    const format = errorSerializerFormat()
    const err = new Error('db failed')
    const result = format({ message: 'boom', metadata: { err } })
    // The walk function should flatten the Error to {type, message, stack}
    expect(result.metadata.err).toMatchObject({
      type: 'Error',
      message: 'db failed',
      stack: expect.any(String),
    })
    // And the message should be preserved
    expect(result.message).toBe('boom')
  })

  test('bare Error passed directly emits non-empty message', () => {
    const format = errorSerializerFormat()
    const err = new Error('bare')
    const result = format(err)
    expect(result).toMatchObject({
      type: 'Error',
      message: 'bare',
      stack: expect.any(String),
    })
  })

  test('null/undefined values pass through', () => {
    const format = errorSerializerFormat()
    const result = format({ message: 'test', nullField: null, undefinedField: undefined })
    expect(result.nullField).toBeNull()
    expect(result.undefinedField).toBeUndefined()
    expect(result.message).toBe('test')
  })

  test('arrays with Errors are mapped', () => {
    const format = errorSerializerFormat()
    const err1 = new Error('first')
    const err2 = new Error('second')
    const result = format({ message: 'test', errors: [err1, err2] })
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toMatchObject({
      type: 'Error',
      message: 'first',
    })
    expect(result.errors[1]).toMatchObject({
      type: 'Error',
      message: 'second',
    })
  })

  test('nested objects are processed recursively', () => {
    const format = errorSerializerFormat()
    const err = new Error('nested')
    const result = format({
      message: 'test',
      nested: {
        deep: {
          error: err,
        },
      },
    })
    expect(result.nested.deep.error).toMatchObject({
      type: 'Error',
      message: 'nested',
    })
  })

  test('Error instances preserve stack trace', () => {
    const format = errorSerializerFormat()
    try {
      throw new Error('stack test')
    } catch (err) {
      const result = format({ err })
      expect(result.err.stack).toContain('stack test')
      expect(result.err.stack).toContain('errorSerializer.test.ts')
    }
  })

  test('non-Error objects pass through unchanged', () => {
    const format = errorSerializerFormat()
    const obj = { name: 'test', value: 42 }
    const result = format({ message: 'test', data: obj })
    expect(result.data).toBe(obj) // same reference
  })

  test('symbol-keyed properties are preserved', () => {
    const format = errorSerializerFormat()
    const sym = Symbol('test')
    const obj = { [sym]: 'symbol-value', regular: 'regular-value' }
    const result = format({ message: 'test', obj })
    // Note: In practice, symbol keys may not be preserved in JSON serialization
    // but the walk function should preserve them in the object
    expect(result.obj[sym]).toBe('symbol-value')
    expect(result.obj.regular).toBe('regular-value')
  })

  test('array with no Error items returns original reference (unchanged)', () => {
    const format = errorSerializerFormat()
    const items = [1, 'string', { key: 'value' }]
    const result = format({ message: 'test', items })
    // When no items in the array change (no Errors), the original array reference is returned
    expect((result as Record<string, unknown>).items).toBe(items)
  })

  test('Error with undefined stack returns empty string for stack', () => {
    const format = errorSerializerFormat()
    const err = new Error('no stack')
    delete err.stack
    const result = format(err) as Record<string, unknown>
    expect(result.stack).toBe('')
  })
})
