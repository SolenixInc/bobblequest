import { describe, expect, test } from 'vitest'
import { EventSchema } from '../../../src/entities/schemas/EventSchema'
import { ReservedSuperProps, isReservedKey } from '../../../src/entities/types/ReservedSuperProps'

describe('EventSchema', () => {
  test('accepts minimal valid event with empty properties', () => {
    const result = EventSchema.safeParse({
      event: 'x',
      distinctId: 'u1',
      properties: {},
    })
    expect(result.success).toBe(true)
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
      event: 'x',
      distinctId: 'u1',
      properties: {},
      groups: { org: 'acme' },
      timestamp: new Date(),
    })
    expect(result.success).toBe(true)
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
