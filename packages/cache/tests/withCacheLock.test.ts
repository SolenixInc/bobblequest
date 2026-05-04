import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { withCacheLock } from '../src/helpers/withCacheLock.ts'
import {
  CacheLockTimeoutError,
  InMemoryCacheImpl,
} from '../src/infrastructure/InMemoryCacheImpl.ts'

const KEY = 'test:lock:resource-1'

describe('withCacheLock — basic execution', () => {
  let cache: InMemoryCacheImpl

  beforeEach(() => {
    cache = new InMemoryCacheImpl()
  })
  afterEach(async () => {
    await cache.close()
  })

  it('[SUCCESS] executes fn and passes the return value through', async () => {
    const result = await withCacheLock(cache, KEY, 5, async () => 'payload')
    expect(result).toBe('payload')
  })

  it('[SUCCESS] executes fn and passes a structured return value through', async () => {
    const result = await withCacheLock(cache, KEY, 5, async () => ({ ok: true, count: 42 }))
    expect(result).toEqual({ ok: true, count: 42 })
  })

  it('[SUCCESS] lock is released after fn resolves — next caller can acquire', async () => {
    await withCacheLock(cache, KEY, 5, async () => 'first')
    // If the lock was not released this second call would timeout.
    const second = await withCacheLock(cache, KEY, 1, async () => 'second')
    expect(second).toBe('second')
  })

  it('[ERROR] propagates exceptions thrown by fn', async () => {
    await expect(
      withCacheLock(cache, KEY, 5, async () => {
        throw new Error('fn failed')
      }),
    ).rejects.toThrow('fn failed')
  })

  it('[ERROR] lock is released even when fn throws', async () => {
    await expect(
      withCacheLock(cache, KEY, 5, async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    // Lock must be released — next acquire should succeed quickly.
    const result = await withCacheLock(cache, KEY, 1, async () => 'after-throw')
    expect(result).toBe('after-throw')
  })
})

describe('withCacheLock — concurrency / serialization', () => {
  let cache: InMemoryCacheImpl

  beforeEach(() => {
    cache = new InMemoryCacheImpl()
  })
  afterEach(async () => {
    await cache.close()
  })

  it('[EDGE] second concurrent call waits for first to finish', async () => {
    const order: string[] = []

    const first = withCacheLock(cache, KEY, 5, async () => {
      order.push('a:start')
      await new Promise<void>((r) => setTimeout(r, 20))
      order.push('a:end')
    })

    const second = withCacheLock(cache, KEY, 5, async () => {
      order.push('b:start')
      order.push('b:end')
    })

    await Promise.all([first, second])
    // Flush queueMicrotask cleanup from withLock's finally block.
    await Promise.resolve()

    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end'])
  })

  it('[EDGE] throws CacheLockTimeoutError when acquisition exceeds ttlSeconds', async () => {
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })

    // Hold the lock indefinitely
    const holder = withCacheLock(cache, KEY, 5, async () => {
      await held
    })

    // Second caller times out quickly
    await expect(
      withCacheLock(cache, KEY, 1, async () => {
        /* unreachable */
      }),
    ).rejects.toBeInstanceOf(CacheLockTimeoutError)

    release()
    await holder
  })
})
