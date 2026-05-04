import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CacheLockTimeoutError,
  InMemoryCacheImpl,
} from '../src/infrastructure/InMemoryCacheImpl.ts'

describe('InMemoryCacheImpl — get/set/del', () => {
  let cache: InMemoryCacheImpl
  beforeEach(() => {
    cache = new InMemoryCacheImpl()
  })
  afterEach(async () => {
    await cache.close()
  })

  it('returns null for a missing key', async () => {
    expect(await cache.get('x')).toBeNull()
  })

  it('roundtrips primitives and objects via JSON', async () => {
    await cache.set('num', 42)
    await cache.set('obj', { a: 1, b: ['x', 'y'] })
    expect(await cache.get<number>('num')).toBe(42)
    expect(await cache.get<{ a: number; b: string[] }>('obj')).toEqual({
      a: 1,
      b: ['x', 'y'],
    })
  })

  it('del removes the entry idempotently', async () => {
    await cache.set('k', 'v')
    await cache.del('k')
    await cache.del('k')
    expect(await cache.get('k')).toBeNull()
  })
})

describe('InMemoryCacheImpl — TTL', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('expires entries after ttlSeconds', async () => {
    const cache = new InMemoryCacheImpl()
    await cache.set('k', 'v', 1)
    expect(await cache.get('k')).toBe('v')
    await vi.advanceTimersByTimeAsync(1_001)
    expect(await cache.get('k')).toBeNull()
    await cache.close()
  })

  it('set without ttl persists across time advances', async () => {
    const cache = new InMemoryCacheImpl()
    await cache.set('k', 'v')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(await cache.get('k')).toBe('v')
    await cache.close()
  })
})

describe('InMemoryCacheImpl — incr', () => {
  let cache: InMemoryCacheImpl
  beforeEach(() => {
    cache = new InMemoryCacheImpl()
  })
  afterEach(async () => {
    await cache.close()
  })

  it('starts at 0 and increments atomically', async () => {
    expect(await cache.incr('c')).toBe(1)
    expect(await cache.incr('c')).toBe(2)
    expect(await cache.incr('c')).toBe(3)
  })

  it('applies TTL on first increment and resets on subsequent', async () => {
    vi.useFakeTimers()
    try {
      await cache.incr('c', 2)
      await vi.advanceTimersByTimeAsync(1_500)
      await cache.incr('c', 2)
      await vi.advanceTimersByTimeAsync(1_500)
      // Still within the second TTL window
      expect(await cache.get<string>('c')).toBe(2)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(await cache.get('c')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('throws when incrementing a non-integer value', async () => {
    await cache.set('c', 'not-a-number')
    await expect(cache.incr('c')).rejects.toThrow(/not an integer/)
  })
})

describe('InMemoryCacheImpl — pub/sub', () => {
  let cache: InMemoryCacheImpl
  beforeEach(() => {
    cache = new InMemoryCacheImpl()
  })
  afterEach(async () => {
    await cache.close()
  })

  it('delivers published payloads to subscribers (JSON roundtrip)', async () => {
    const received: unknown[] = []
    const unsubscribe = await cache.subscribe('ch', (p) => received.push(p))
    await cache.publish('ch', { hello: 'world' })
    await new Promise((r) => setImmediate(r))
    expect(received).toEqual([{ hello: 'world' }])
    await unsubscribe()
  })

  it('unsubscribe removes the handler', async () => {
    const received: unknown[] = []
    const unsub = await cache.subscribe('ch', (p) => received.push(p))
    await unsub()
    await cache.publish('ch', 'silent')
    await new Promise((r) => setImmediate(r))
    expect(received).toEqual([])
  })

  it('swallows exceptions thrown by a subscriber handler', async () => {
    await cache.subscribe('ch', () => {
      throw new Error('handler crash')
    })
    await cache.publish('ch', 'data')
    // Let the queueMicrotask dispatch run — covers the catch {} branch
    await new Promise((r) => setImmediate(r))
  })

  it('unsubscribe cleans up channel entry when last handler is removed', async () => {
    const unsub = await cache.subscribe('ch', () => {})
    await unsub()
    // Re-subscribe after unsub: should work (channel entry was cleaned up)
    const received: unknown[] = []
    await cache.subscribe('ch', (p) => received.push(p))
    await cache.publish('ch', 'hello')
    await new Promise((r) => setImmediate(r))
    expect(received).toEqual(['hello'])
  })

  it('unsubscribe is a no-op when called after channel entry is gone', async () => {
    const unsub = await cache.subscribe('ch', () => {})
    await unsub()
    // Channel entry is now deleted; second call hits the !current early-return path
    await expect(unsub()).resolves.toBeUndefined()
  })
})

describe('InMemoryCacheImpl — withLock', () => {
  let cache: InMemoryCacheImpl
  beforeEach(() => {
    cache = new InMemoryCacheImpl()
  })
  afterEach(async () => {
    await cache.close()
  })

  it('throws immediately when ttlSeconds <= 0', async () => {
    await expect(cache.withLock('k', 0, async () => {})).rejects.toThrow(/ttlSeconds must be > 0/)
  })

  it('serializes contending callers on the same key', async () => {
    const order: string[] = []
    const first = cache.withLock('k', 5, async () => {
      order.push('a:start')
      await new Promise((r) => setTimeout(r, 20))
      order.push('a:end')
    })
    const second = cache.withLock('k', 5, async () => {
      order.push('b:start')
      order.push('b:end')
    })
    await Promise.all([first, second])
    // Flush queueMicrotask callbacks from the finally block cleanup.
    await Promise.resolve()
    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end'])
  })

  it('throws CacheLockTimeoutError when acquisition exceeds ttlSeconds', async () => {
    // Hold the lock for 5s via a pending promise; second caller has ttl=1
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const first = cache.withLock('k', 5, async () => {
      await held
    })
    await expect(
      cache.withLock('k', 1, async () => {
        /* noop */
      }),
    ).rejects.toBeInstanceOf(CacheLockTimeoutError)
    release()
    await first
  })
})

describe('InMemoryCacheImpl — close', () => {
  it('throws when used after close()', async () => {
    const cache = new InMemoryCacheImpl()
    await cache.set('k', 'v')
    await cache.close()
    await expect(cache.get('k')).rejects.toThrow(/after close/)
  })

  it('clears active TTL timers on close', async () => {
    const cache = new InMemoryCacheImpl()
    // Set with a long TTL so the timer is still live when close() is called.
    await cache.set('k', 'v', 60)
    // close() must walk timers and clearTimeout them — covers lines 176-177
    await cache.close()
    // The cache is now closed; any access throws.
    await expect(cache.get('k')).rejects.toThrow(/after close/)
  })
})

describe('InMemoryCacheImpl — ping', () => {
  it('returns true when not closed', async () => {
    const cache = new InMemoryCacheImpl()
    expect(await cache.ping()).toBe(true)
    await cache.close()
  })

  it('returns false when closed', async () => {
    const cache = new InMemoryCacheImpl()
    await cache.close()
    expect(await cache.ping()).toBe(false)
  })
})
