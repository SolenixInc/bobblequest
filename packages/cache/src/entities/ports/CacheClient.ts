/**
 * Canonical cache port. Implementations adapt this surface to a concrete
 * backend (Redis, in-memory test double). Consumers — apps and other
 * packages — depend ONLY on this abstract class, never on a concrete impl.
 *
 * Serialization contract: values are JSON-serialized before storage and
 * JSON-parsed on read. Callers pass plain data; they do not pre-stringify.
 *
 * Key namespacing: keys SHOULD follow `<env>:<module>:<id>`. Use
 * `buildCacheKey` / `CacheKeySchema` in `entities/schemas` to enforce this
 * at the composition boundary.
 *
 * Exposes exactly 8 methods covering cache get/set/del, atomic counters,
 * distributed locks, and pub/sub.
 */
export abstract class CacheClient {
  /**
   * Fetch a JSON-serialized value for `key`. Returns `null` if the key is
   * absent or expired. Throws only on transport-level failures; schema /
   * JSON errors surface as the underlying parse error.
   */
  abstract get<T>(key: string): Promise<T | null>

  /**
   * Store `value` under `key`, JSON-serialized. `ttlSeconds` is optional;
   * when omitted the entry persists until explicitly deleted. Passing a
   * non-positive TTL is a caller error — implementations SHOULD treat it
   * as "no TTL" rather than immediate expiry.
   */
  abstract set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>

  /**
   * Delete `key`. Idempotent — deleting an absent key is not an error.
   */
  abstract del(key: string): Promise<void>

  /**
   * Atomically increment the integer counter at `key` by 1 and return the
   * new value. If the key is absent it starts at 0. When `ttlSeconds` is
   * provided, (re)sets the expiry on the key atomically with the increment
   * — Redis impl uses a Lua script to guarantee atomicity.
   */
  abstract incr(key: string, ttlSeconds?: number): Promise<number>

  /**
   * Run `fn` while holding a distributed lock on `key`. Implementations
   * use SET NX PX with a random token and release via a Lua CAS so the
   * lock is never released by a different holder. `ttlSeconds` is the
   * hard upper bound on both lock lifetime and acquisition wait.
   *
   * CAVEAT: single-node Redlock approximation — not safe across failover
   * gaps on a replicated cluster without RedLock. Treat this as a
   * best-effort mutex for non-critical coordination (rate limiter resets,
   * cache warmers, etc.), NOT as a correctness-critical lease.
   */
  abstract withLock<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T>

  /**
   * Publish `payload` to `channel`. Fire-and-forget — the promise resolves
   * when the command is accepted by the broker, NOT when subscribers
   * receive it. Payloads are JSON-serialized.
   */
  abstract publish(channel: string, payload: unknown): Promise<void>

  /**
   * Subscribe to `channel`. `handler` receives JSON-parsed payloads.
   * Returns an unsubscribe function that removes this specific handler
   * and, when no handlers remain, unsubscribes the transport from the
   * channel. The unsubscribe function does NOT close the underlying
   * subscriber connection.
   */
  abstract subscribe(
    channel: string,
    handler: (payload: unknown) => void,
  ): Promise<() => Promise<void>>

  /**
   * Release all resources — connections, subscribers, pending timers.
   * Call on graceful shutdown (SIGTERM). After `close()`, the instance
   * MUST NOT be used.
   */
  abstract close(): Promise<void>

  /**
   * Ping the underlying transport (Redis) or verify instance liveness.
   * Returns `true` if the transport is reachable and responding.
   */
  abstract ping(): Promise<boolean>
}
