import { CacheClient } from '../entities/ports/CacheClient.ts'

/**
 * Error thrown by `withLock` when the lock cannot be acquired within the
 * TTL window.
 */
export class CacheLockTimeoutError extends Error {
  constructor(key: string, ttlSeconds: number) {
    super(`withLock: failed to acquire lock '${key}' within ${ttlSeconds}s`)
    this.name = 'CacheLockTimeoutError'
  }
}

interface Entry {
  readonly value: string
  expiresAt?: number
}

type SubscribeHandler = (payload: unknown) => void

/**
 * In-memory `CacheClient` implementation used for tests and local
 * development. Mirrors Redis semantics closely enough that unit tests
 * against the port surface give useful signal:
 *   - values are stored as JSON strings (so `incr` parses/stringifies
 *     integers identically to Redis)
 *   - TTLs are enforced both lazily (on read) and proactively (setTimeout)
 *     so pub/sub-based tests can observe expiry without fake timers
 *   - `withLock` serializes contending calls via a per-key promise chain
 *
 * Not thread-safe across workers — it's a single-process shared Map.
 */
export class InMemoryCacheImpl extends CacheClient {
  private readonly store = new Map<string, Entry>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly subscribers = new Map<string, Set<SubscribeHandler>>()
  private readonly lockChains = new Map<string, Promise<void>>()
  private closed = false

  async get<T>(key: string): Promise<T | null> {
    this.assertOpen()
    const entry = this.readFresh(key)
    if (!entry) return null
    return JSON.parse(entry.value) as T
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.assertOpen()
    const serialized = JSON.stringify(value)
    this.writeEntry(key, serialized, ttlSeconds)
  }

  async del(key: string): Promise<void> {
    this.assertOpen()
    this.clearTimer(key)
    this.store.delete(key)
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    this.assertOpen()
    const entry = this.readFresh(key)
    const current = entry ? Number.parseInt(entry.value, 10) : 0
    if (entry && Number.isNaN(current)) {
      throw new Error(`incr: value at '${key}' is not an integer (got '${entry.value}')`)
    }
    const next = current + 1
    this.writeEntry(key, String(next), ttlSeconds)
    return next
  }

  async withLock<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    this.assertOpen()
    if (ttlSeconds <= 0) {
      throw new Error('withLock: ttlSeconds must be > 0')
    }

    const prior = this.lockChains.get(key) ?? Promise.resolve()

    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const mySlot = prior.then(() => held)
    this.lockChains.set(key, mySlot)

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const acquired = await Promise.race([
      prior.then(() => true as const),
      new Promise<false>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(false), ttlSeconds * 1000)
        if (typeof (timeoutHandle as unknown as { unref?: () => void }).unref === 'function') {
          ;(timeoutHandle as unknown as { unref: () => void }).unref()
        }
      }),
    ])
    if (timeoutHandle) clearTimeout(timeoutHandle)

    if (!acquired) {
      // Release our slot so the chain doesn't deadlock forever.
      release()
      if (this.lockChains.get(key) === mySlot) {
        this.lockChains.delete(key)
      }
      throw new CacheLockTimeoutError(key, ttlSeconds)
    }

    try {
      return await fn()
    } finally {
      release()
      // Best-effort chain cleanup: if no one appended after us, drop the
      // entry so the Map doesn't grow unbounded across many unique keys.
      queueMicrotask(() => {
        if (this.lockChains.get(key) === mySlot) {
          this.lockChains.delete(key)
        }
      })
    }
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    this.assertOpen()
    const handlers = this.subscribers.get(channel)
    if (!handlers || handlers.size === 0) return
    const serialized = JSON.stringify(payload)
    // Parse once to mirror the JSON round-trip that a real broker forces.
    const delivered = JSON.parse(serialized)
    for (const handler of handlers) {
      // Dispatch async so publish is effectively fire-and-forget and
      // handler errors don't propagate into the publisher.
      queueMicrotask(() => {
        try {
          handler(delivered)
          /* v8 ignore next 3 */
        } catch {
          // Swallow — matches Redis pub/sub where the broker never sees
          // subscriber exceptions.
        }
      })
    }
  }

  async subscribe(channel: string, handler: SubscribeHandler): Promise<() => Promise<void>> {
    this.assertOpen()
    let set = this.subscribers.get(channel)
    if (!set) {
      set = new Set()
      this.subscribers.set(channel, set)
    }
    set.add(handler)

    const unsubscribe = async (): Promise<void> => {
      const current = this.subscribers.get(channel)
      if (!current) return
      current.delete(handler)
      if (current.size === 0) {
        this.subscribers.delete(channel)
      }
    }
    return unsubscribe
  }

  async close(): Promise<void> {
    this.closed = true
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
    this.store.clear()
    this.subscribers.clear()
    this.lockChains.clear()
  }

  async ping(): Promise<boolean> {
    return !this.closed
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('InMemoryCacheImpl: used after close()')
    }
  }

  private readFresh(key: string): Entry | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    /* v8 ignore start */
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.clearTimer(key)
      this.store.delete(key)
      return undefined
    }
    /* v8 ignore stop */
    return entry
  }

  private writeEntry(key: string, value: string, ttlSeconds: number | undefined): void {
    this.clearTimer(key)
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      const expiresAt = Date.now() + ttlSeconds * 1000
      this.store.set(key, { value, expiresAt })
      const timer = setTimeout(() => {
        const entry = this.store.get(key)
        if (entry && entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
          this.store.delete(key)
        }
        this.timers.delete(key)
      }, ttlSeconds * 1000)
      // Prevent TTL timers from keeping the process alive in test runners.
      if (typeof (timer as unknown as { unref?: () => void }).unref === 'function') {
        ;(timer as unknown as { unref: () => void }).unref()
      }
      this.timers.set(key, timer)
    } else {
      this.store.set(key, { value })
    }
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }
}
