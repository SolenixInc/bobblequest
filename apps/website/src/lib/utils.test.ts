import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges two class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('filters falsy values', () => {
    expect(cn('a', null, undefined, false, 'b')).toBe('a b')
  })

  it('accepts an array input', () => {
    expect(cn(['a', 'b'])).toBe('a b')
  })

  it('returns empty string when called with no arguments', () => {
    expect(cn()).toBe('')
  })
})
