import { describe, expect, test } from 'vitest'
import { EventSchema } from '../src/schemas/EventSchema'
import { ReservedSuperProps, isReservedKey } from '../src/types/ReservedSuperProps'

describe('EventSchema', () => {
  test('accepts minimal valid event with empty properties', () => {
    const result = EventSchema.safeParse({
      event: 'x',
      distinctId: 'u1',
      properties: {},
    })
    expect(result.success).toBe(true)
  })

  test('rejects event with empty string event name', () => {
    const result = EventSchema.safeParse({
      event: '',
      distinctId: 'u1',
      properties: {},
    })
    expect(result.success).toBe(false)
  })

  test('rejects event with empty string distinctId', () => {
    const result = EventSchema.safeParse({
      event: 'page_view',
      distinctId: '',
      properties: {},
    })
    expect(result.success).toBe(false)
  })

  test('rejects event missing properties field', () => {
    const result = EventSchema.safeParse({
      event: 'x',
      distinctId: 'u1',
    })
    expect(result.success).toBe(false)
  })

  test('accepts event with optional groups and timestamp', () => {
    const result = EventSchema.safeParse({
      event: 'purchase',
      distinctId: 'u1',
      properties: { plan: 'pro' },
      groups: { org: 'acme' },
      timestamp: new Date(),
    })
    expect(result.success).toBe(true)
  })

  test('accepts event with arbitrary properties', () => {
    const result = EventSchema.safeParse({
      event: 'custom',
      distinctId: 'u2',
      properties: { nested: { a: 1 }, flag: true },
    })
    expect(result.success).toBe(true)
  })

  test('rejects event missing both event and distinctId', () => {
    const result = EventSchema.safeParse({ properties: {} })
    expect(result.success).toBe(false)
  })
})

describe('ReservedSuperProps', () => {
  test('isReservedKey returns true for $environment', () => {
    expect(isReservedKey('$environment')).toBe(true)
  })

  test('isReservedKey returns true for $service', () => {
    expect(isReservedKey('$service')).toBe(true)
  })

  test('isReservedKey returns true for distinct_id', () => {
    expect(isReservedKey('distinct_id')).toBe(true)
  })

  test('isReservedKey returns true for request_id', () => {
    expect(isReservedKey('request_id')).toBe(true)
  })

  test('isReservedKey returns true for $group', () => {
    expect(isReservedKey('$group')).toBe(true)
  })

  test('isReservedKey returns true for $session_id', () => {
    expect(isReservedKey('$session_id')).toBe(true)
  })

  test('isReservedKey returns false for custom_prop', () => {
    expect(isReservedKey('custom_prop')).toBe(false)
  })

  test('isReservedKey returns false for empty string', () => {
    expect(isReservedKey('')).toBe(false)
  })

  test('ReservedSuperProps includes all six reserved keys', () => {
    const expected = [
      '$environment',
      '$service',
      '$session_id',
      'distinct_id',
      'request_id',
      '$group',
    ]
    for (const key of expected) {
      expect(ReservedSuperProps).toContain(key)
    }
    expect(ReservedSuperProps.length).toBe(6)
  })
})
