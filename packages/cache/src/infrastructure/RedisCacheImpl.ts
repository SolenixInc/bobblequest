import { randomUUID } from 'node:crypto'
import type { RedisConfig } from '@t/config'
import Redis, { type RedisOptions } from 'ioredis'
import { CacheClient } from '../entities/ports/CacheClient.ts'
import { CacheLockTimeoutError } from './InMemoryCacheImpl.ts'

type SubscribeHandler = (payload: unknown) => void

const INCR_WITH_TTL_LUA = `local val = redis.call('incr', KEYS[1])
if ARGV[1] ~= '' then
  redis.call('expire', KEYS[1], ARGV[1])
end
return val`

const RELEASE_LOCK_LUA = `if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end`

/**
 * Redis-backed `CacheClient` implementation.
 *
 *   - Serialization: JSON in/out.
 *   - `incr` with TTL: atomic via {@link INCR_WITH_TTL_LUA}.
 *   - `withLock`: SET NX PX with a random UUID token; release via CAS
 *     {@link RELEASE_LOCK_LUA} so the lock can never be released by a
 *     different holder. Acquisition polls every 50ms up to `ttlSeconds`.
 *   - Pub/sub: command and subscriber connections are separate â€” ioredis
 *     forbids command traffic on a connection already in subscriber mode.
 *     The subscriber is lazily created on the first `subscribe()` call.
 *   - Shutdown: `close()` quits both connections.
 */
export class RedisCacheImpl extends CacheClient {
  private readonly client: Redis
  private subscriber: Redis | null = null
  private readonly handlers = new Map<string, Set<SubscribeHandler>>()
  private subscriberMessageBound = false

  constructor(config: RedisConfig) {
    super()
    this.client = createRedisClient(config)
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value)
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await this.client.set(key, serialized, 'EX', ttlSeconds)
    } else {
      await this.client.set(key, serialized)
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const ttlArg = ttlSeconds !== undefined && ttlSeconds > 0 ? String(ttlSeconds) : ''
    const result = await this.client.eval(INCR_WITH_TTL_LUA, 1, key, ttlArg)
    return typeof result === 'number' ? result : Number(result)
  }

  async withLock<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    if (ttlSeconds <= 0) {
      throw new Error('withLock: ttlSeconds must be > 0')
    }
    const token = randomUUID()
    const ttlMs = ttlSeconds * 1000
    const deadline = Date.now() + ttlMs
    const pollMs = 50

    let acquired = false
    while (Date.now() < deadline) {
      const ok = await this.client.set(key, token, 'PX', ttlMs, 'NX')
      if (ok === 'OK') {
        acquired = true
        break
      }
      await sleep(Math.min(pollMs, Math.max(0, deadline - Date.now())))
    }

    if (!acquired) {
      throw new CacheLockTimeoutError(key, ttlSeconds)
    }

    try {
      return await fn()
    } finally {
      try {
        await this.client.eval(RELEASE_LOCK_LUA, 1, key, token)
      } catch {
        // Swallow release errors â€” the key will expire on its own.
      }
    }
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    await this.client.publish(channel, JSON.stringify(payload))
  }

  async subscribe(channel: string, handler: SubscribeHandler): Promise<() => Promise<void>> {
    const subscriber = this.ensureSubscriber()

    let set = this.handlers.get(channel)
    const firstForChannel = !set
    if (!set) {
      set = new Set()
      this.handlers.set(channel, set)
    }
    set.add(handler)

    if (firstForChannel) {
      await subscriber.subscribe(channel)
    }

    const unsubscribe = async (): Promise<void> => {
      const current = this.handlers.get(channel)
      if (!current) return
      current.delete(handler)
      if (current.size === 0) {
        this.handlers.delete(channel)
        try {
          await subscriber.unsubscribe(channel)
        } catch {
          // Tolerate races where the connection is already gone.
        }
      }
    }
    return unsubscribe
  }

  async close(): Promise<void> {
    const tasks: Array<Promise<unknown>> = []
    tasks.push(safeQuit(this.client))
    if (this.subscriber) {
      tasks.push(safeQuit(this.subscriber))
      this.subscriber = null
    }
    this.handlers.clear()
    await Promise.all(tasks)
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  private ensureSubscriber(): Redis {
    if (this.subscriber) return this.subscriber
    const sub = this.client.duplicate()
    this.subscriber = sub
    if (!this.subscriberMessageBound) {
      sub.on('message', (channel: string, raw: string) => {
        const handlers = this.handlers.get(channel)
        if (!handlers || handlers.size === 0) return
        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          parsed = raw
        }
        for (const handler of handlers) {
          try {
            handler(parsed)
          } catch {
            // Swallow â€” mirrors broker behavior.
          }
        }
      })
      this.subscriberMessageBound = true
    }
    return sub
  }
}

function createRedisClient(config: RedisConfig): Redis {
  if (config.url) {
    return new Redis(config.url, { lazyConnect: false })
  }
  const opts: RedisOptions = {
    host: config.host ?? '127.0.0.1',
    port: config.port ?? 6379,
    db: config.db,
    lazyConnect: false,
  }
  if (config.password) opts.password = config.password
  if (config.tls) opts.tls = {}
  return new Redis(opts)
}

function sleep(ms: number): Promise<void> {
  /* v8 ignore next */
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    if (typeof (t as unknown as { unref?: () => void }).unref === 'function') {
      ;(t as unknown as { unref: () => void }).unref()
    }
  })
}

async function safeQuit(client: Redis): Promise<void> {
  try {
    await client.quit()
  } catch {
    try {
      client.disconnect()
    } catch {
      // Best-effort shutdown â€” never throw from close().
    }
  }
}
