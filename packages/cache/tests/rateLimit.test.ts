import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rateLimit } from '../src/helpers/rateLimit.ts'
import type { RateLimitOptions } from '../src/helpers/rateLimit.ts'
import { InMemoryCacheImpl } from '../src/infrastructure/InMemoryCacheImpl.ts'

const KEY = 'test:ratelimit:user-1'

describe('rateLimit — result shape', () => {
  let cache: InMemoryCacheImpl

  beforeEach(() => {
    cache = new InMemoryCacheImpl()
  })
  afterEach(async () => {
    await cache.close()
  })

  it('[SUCCESS] first call is allowed and returns correct field values', async () => {
    const opts: RateLimitOptions = { cache, key: KEY, max: 5, windowSeconds: 60 }
    const result = await rateLimit(opts)
    expect(result.allowed).toBe(true)
    expect(result.count).toBe(1)
    expect(result.remaining).toBe(4)
    expect(result.resetSeconds).toBe(60)
  })

  it('[SUCCESS] call at the exact limit (count === max) is allowed', async () => {
    const opts: RateLimitOptions = { cache, key: KEY, max: 3, windowSeconds: 60 }
    await rateLimit(opts) // count=1
    await rateLimit(opts) // count=2
    const result = await rateLimit(opts) // count=3 === max
    expect(result.allowed).toBe(true)
    expect(result.count).toBe(3)
    expect(result.remaining).toBe(0)
  })

  it('[ERROR] call beyond the limit (count > max) is denied', async () => {
    const opts: RateLimitOptions = { cache, key: KEY, max: 2, windowSeconds: 60 }
    await rateLimit(opts) // count=1
    await rateLimit(opts) // count=2 — at limit, allowed
    const result = await rateLimit(opts) // count=3 — over limit
    expect(result.allowed).toBe(false)
    expect(result.count).toBe(3)
    expect(result.remaining).toBe(0)
  })

  it('[EDGE] remaining never goes below 0 when count greatly exceeds max', async () => {
    const opts: RateLimitOptions = { cache, key: KEY, max: 1, windowSeconds: 60 }
    await rateLimit(opts) // count=1 — at limit
    await rateLimit(opts) // count=2 — over
    const result = await rateLimit(opts) // count=3 — well over
    expect(result.remaining).toBe(0)
    expect(result.allowed).toBe(false)
  })
})

describe('rateLimit — window reset (fake timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('[SUCCESS] counter resets after windowSeconds, allowing requests again', async () => {
    const cache = new InMemoryCacheImpl()
    try {
      const opts: RateLimitOptions = { cache, key: KEY, max: 2, windowSeconds: 1 }

      // Exhaust the window
      await rateLimit(opts) // count=1
      await rateLimit(opts) // count=2
      const denied = await rateLimit(opts) // count=3 — denied
      expect(denied.allowed).toBe(false)

      // Advance past window expiry
      await vi.advanceTimersByTimeAsync(1_100)

      // Counter should have reset — first call in new window is allowed
      const reset = await rateLimit(opts)
      expect(reset.allowed).toBe(true)
      expect(reset.count).toBe(1)
    } finally {
      await cache.close()
    }
  })
})
