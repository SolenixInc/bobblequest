import { describe, expect, it } from 'vitest'
import { CacheKeySchema, buildCacheKey } from '../src/entities/schemas/CacheKeySchema.ts'

describe('CacheKeySchema', () => {
  it('accepts a canonical <env>:<module>:<id> key', () => {
    expect(() => CacheKeySchema.parse('prod:ratelimit:user-123')).not.toThrow()
  })

  it('accepts URL-safe ids with hyphens, underscores, dots', () => {
    expect(() => CacheKeySchema.parse('dev:billing:invoice_2024.10')).not.toThrow()
  })

  it('rejects a key missing a segment', () => {
    expect(() => CacheKeySchema.parse('prod:ratelimit')).toThrow()
  })

  it('rejects a key with four segments', () => {
    expect(() => CacheKeySchema.parse('prod:ratelimit:user:123')).toThrow()
  })

  it('rejects a key containing whitespace', () => {
    expect(() => CacheKeySchema.parse('prod:rate limit:user')).toThrow()
  })

  it('rejects an empty segment', () => {
    expect(() => CacheKeySchema.parse('prod::user')).toThrow()
  })
})

describe('buildCacheKey', () => {
  it('composes valid segments into a canonical key', () => {
    expect(buildCacheKey({ env: 'prod', module: 'ratelimit', id: 'user-123' })).toBe(
      'prod:ratelimit:user-123',
    )
  })

  it('rejects an empty segment', () => {
    expect(() => buildCacheKey({ env: 'prod', module: '', id: 'x' })).toThrow(/module/)
  })

  it('rejects a segment containing a colon', () => {
    expect(() => buildCacheKey({ env: 'prod', module: 'rate:limit', id: 'x' })).toThrow(/module/)
  })

  it('rejects a segment containing whitespace', () => {
    expect(() => buildCacheKey({ env: 'prod', module: 'ratelimit', id: 'user 1' })).toThrow(/id/)
  })
})
