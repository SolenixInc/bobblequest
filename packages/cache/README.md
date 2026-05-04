# @t/cache

Cache port + Redis / in-memory implementations for the template monorepo.

## Overview

A single abstract-class port, `CacheClient`, with two bundled adapters:

- `RedisCacheImpl` -- production backend over `ioredis`.
- `InMemoryCacheImpl` -- test double / local dev fallback. Single-process only.

All values are JSON-serialized on write and JSON-parsed on read -- callers pass
plain data.

## Port surface

```ts
abstract class CacheClient {
  get<T>(key): Promise<T | null>
  set<T>(key, value, ttlSeconds?): Promise<void>
  del(key): Promise<void>
  incr(key, ttlSeconds?): Promise<number>     // atomic incr + optional TTL reset
  withLock<T>(key, ttlSeconds, fn): Promise<T> // SET NX PX + CAS release
  publish(channel, payload): Promise<void>
  subscribe(channel, handler): Promise<unsubscribe>
  close(): Promise<void>
}
```

### Key convention

Keys SHOULD match `<env>:<module>:<id>`. Use `buildCacheKey` to compose and
validate:

```ts
import { buildCacheKey } from '@t/cache'

const key = buildCacheKey({ env: 'prod', module: 'ratelimit', id: userId })
await cache.set(key, { count: 1 }, 60)
```

## Helpers

Named, documented wrappers over the `CacheClient` port surface. Import from `@t/cache`.

### rateLimit

Fixed-window rate limiter backed by `cache.incr`. Atomically increments a counter and returns
whether the caller is within the allowed quota.

```ts
import { rateLimit, buildCacheKey } from '@t/cache'

const result = await rateLimit({
  cache,
  key: buildCacheKey({ env: 'prod', module: 'ratelimit', id: userId }),
  max: 100,
  windowSeconds: 60,
})

if (!result.allowed) {
  // result.count, result.remaining, result.resetSeconds available
  throw new TooManyRequestsError()
}
```

`allowed = count <= max` (at-limit is still allowed). `resetSeconds` is `windowSeconds` --
fixed-window approximation; the window start is not tracked.

### withCacheLock

Thin named wrapper over `cache.withLock`. Acquires a distributed lock on `key` for up to
`ttlSeconds`, runs `fn`, then releases. Throws `CacheLockTimeoutError` if acquisition times out.

```ts
import { withCacheLock } from '@t/cache'

const result = await withCacheLock(cache, lockKey, 10, async () => {
  return await refreshCachedData()
})
```

CAVEAT: single-node Redlock approximation -- not safe across failover gaps on a replicated cluster.
Use for best-effort coordination (cache warmers, rate-limit resets), not correctness-critical
leases.

## Environment variables

Wired into `@t/config` -> `config.redis`:

```text
REDIS_URL        full connection URL (preferred if set)
REDIS_HOST       host (default: 127.0.0.1)
REDIS_PORT       port (default: 6379)
REDIS_PASSWORD   optional
REDIS_TLS        truthy -> enable TLS
REDIS_DB         optional db index
```

When `REDIS_URL` is set it wins over the discrete fields.

## DI registration

```ts
import { registerCacheDI, CACHE_DEPENDENCY_KEY } from '@t/cache'

registerCacheDI(container, {
  config,
  environment: 'production', // 'development' | 'testing' | 'production'
})

const cache = container.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)
```

Selection:
- `environment === 'testing'` -> `InMemoryCacheImpl`
- otherwise -> `RedisCacheImpl` (reads `config.redis`)

Lifetime is `singleton` -- the cache owns long-lived Redis connections.

## Testing

### Unit tests

```bash
pnpm --filter @t/cache test
```

Runs all tests under `tests/` (excluding `tests/integration/`). Requires 100% coverage.

- `InMemoryCacheImpl` tests cover the full port surface (TTL via fake timers,
  incr atomicity, pub/sub roundtrip, withLock serialization + timeout).
- `RedisCacheImpl` unit tests mock `ioredis` -- no real Redis required.
- DI registrar tests mock `ioredis` so construction does not open sockets.

### Integration tests

Integration tests run `RedisCacheImpl` against a real Redis instance.

**1. Start Redis:**

```bash
docker compose -f docker-compose.cache.yml up -d
```

**2. Run:**

```bash
REDIS_URL=redis://:redispassword@localhost:6380 pnpm --filter @t/cache test:integration
```

Integration tests are in `tests/integration/RedisCacheImpl.live.test.ts` and cover:
get/set/del round-trip, atomic incr + TTL, withLock mutual exclusion (CAS release),
pub/sub fanout across separate clients, and close() cleanup.

If `REDIS_URL` is not set the suite throws a clear error with startup instructions.

## Caveats

- `withLock` is a single-node Redlock approximation. Use it for best-effort
  coordination (cache warmers, rate-limit buckets), NOT as a
  correctness-critical lease. For that, reach for a RedLock client against
  an independent quorum.
- Pub/sub is fire-and-forget. `publish` resolves once the broker accepts the
  command -- it does not wait for subscribers.
- `InMemoryCacheImpl` does NOT cross process boundaries. Tests relying on
  pub/sub between two container instances must use Redis.
