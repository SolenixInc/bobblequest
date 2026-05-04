import type { CacheClient } from '../entities/ports/CacheClient.ts'

/**
 * Options for the `rateLimit` helper.
 */
export interface RateLimitOptions {
  /**
   * Cache client to use for the atomic counter. Must implement `incr` with TTL
   * semantics (atomically sets expiry on first increment, exactly as
   * `RedisCacheImpl` and `InMemoryCacheImpl` do).
   */
  readonly cache: CacheClient
  /**
   * Pre-built cache key — use `buildCacheKey` from `@t/cache/entities/schemas`
   * to ensure the `<env>:<module>:<id>` convention is enforced before reaching
   * this call site.
   */
  readonly key: string
  /**
   * Maximum number of requests allowed within the window (inclusive).
   * `count === max` is still allowed (`allowed = count <= max`).
   */
  readonly max: number
  /**
   * Fixed-window length in seconds. The counter TTL is set on first increment
   * via `cache.incr(key, windowSeconds)` — a fixed-window approximation.
   */
  readonly windowSeconds: number
}

/**
 * Result returned by `rateLimit`.
 */
export interface RateLimitResult {
  /** `true` when `count <= max`; `false` when the caller should be rejected. */
  readonly allowed: boolean
  /** Absolute counter value after this increment. */
  readonly count: number
  /** Requests remaining in the window (`max - count`, floored at 0). */
  readonly remaining: number
  /**
   * Approximate seconds until the window resets. This is the full
   * `windowSeconds` value (fixed-window approximation — we do not track when
   * the current window started).
   */
  readonly resetSeconds: number
}

/**
 * Fixed-window rate limiter backed by the `CacheClient` port.
 *
 * Atomically increments a counter via `cache.incr(key, windowSeconds)`.
 * The TTL is set on the first increment of each window, so all subsequent
 * increments within that window inherit the same expiry.
 *
 * CAVEAT: fixed-window semantics allow a burst of up to `2 × max` requests
 * across a window boundary. If sliding-window precision matters, use a
 * dedicated rate-limit library. For most API-level throttling this
 * approximation is acceptable.
 *
 * @example
 * ```ts
 * const result = await rateLimit({
 *   cache,
 *   key: buildCacheKey({ env: 'prod', module: 'ratelimit', id: userId }),
 *   max: 100,
 *   windowSeconds: 60,
 * })
 * if (!result.allowed) {
 *   throw new TooManyRequestsError()
 * }
 * ```
 */
export const rateLimit = async (opts: RateLimitOptions): Promise<RateLimitResult> => {
  const { cache, key, max, windowSeconds } = opts
  const count = await cache.incr(key, windowSeconds)
  const allowed = count <= max
  const remaining = Math.max(0, max - count)
  return { allowed, count, remaining, resetSeconds: windowSeconds }
}
