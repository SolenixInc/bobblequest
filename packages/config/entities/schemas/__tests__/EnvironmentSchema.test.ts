import { describe, expect, test } from 'vitest'
import { EnvironmentSchema } from '../EnvironmentSchema.ts'

describe('EnvironmentSchema', () => {
  test.each(['development', 'local', 'testing', 'production'])('accepts "%s"', (env) => {
    expect(EnvironmentSchema.parse(env)).toBe(env)
  })

  test('rejects "staging" (removed from enum)', () => {
    expect(EnvironmentSchema.safeParse('staging').success).toBe(false)
  })

  test('rejects unknown environment value', () => {
    expect(EnvironmentSchema.safeParse('unknown').success).toBe(false)
  })

  test('defaults to "development" when undefined', () => {
    expect(EnvironmentSchema.parse(undefined)).toBe('development')
  })

  test('coerces "test" to "testing"', () => {
    expect(EnvironmentSchema.parse('test')).toBe('testing')
  })
})
