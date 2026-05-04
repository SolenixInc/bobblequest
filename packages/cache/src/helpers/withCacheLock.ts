import type { CacheClient } from '../entities/ports/CacheClient.ts'

/**
 * Thin named wrapper around `CacheClient.withLock`.
 *
 * Acquires a distributed lock on `key` (TTL = `ttlSeconds`) before invoking
 * `fn`. The lock is released in the `finally` block of the underlying
 * implementation regardless of whether `fn` succeeds or throws.
 *
 * CAVEAT: single-node Redlock approximation — not safe across failover gaps
 * on a replicated Redis cluster. Treat as a best-effort mutex for non-critical
 * coordination (cache warmers, rate-limiter resets). See `CacheClient.withLock`
 * JSDoc for full semantics.
 *
 * @param cache      - Cache client that owns the lock.
 * @param key        - Lock key (must be unique per resource being guarded).
 * @param ttlSeconds - Hard upper bound on both lock lifetime and wait time.
 * @param fn         - Work to perform while the lock is held.
 * @returns          The return value of `fn`.
 *
 * @throws {CacheLockTimeoutError} When the lock cannot be acquired within
 *   `ttlSeconds`.
 *
 * @example
 * ```ts
 * const result = await withCacheLock(cache, lockKey, 10, async () => {
 *   // only one caller executes this at a time
 *   return await refreshCachedData()
 * })
 * ```
 */
export const withCacheLock = <T>(
  cache: CacheClient,
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> => cache.withLock(key, ttlSeconds, fn)
