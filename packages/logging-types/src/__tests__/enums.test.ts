import { describe, expect, test } from 'vitest'
import { LogLevel, LogType } from '../index.ts'

describe('LogLevel', () => {
  test('has expected string values', () => {
    expect(LogLevel.DEBUG).toBe('debug')
    expect(LogLevel.INFO).toBe('info')
    expect(LogLevel.WARNING).toBe('warn')
    expect(LogLevel.ERROR).toBe('error')
    expect(LogLevel.CRITICAL).toBe('crit')
  })

  test('covers all five members', () => {
    const members = Object.values(LogLevel)
    expect(members).toHaveLength(5)
  })
})

describe('LogType', () => {
  test('has expected string values', () => {
    expect(LogType.LOCAL).toBe('text')
    expect(LogType.STRUCTURED).toBe('json')
    expect(LogType.QUIET).toBe('error')
  })

  test('covers all three members', () => {
    const members = Object.values(LogType)
    expect(members).toHaveLength(3)
  })
})
