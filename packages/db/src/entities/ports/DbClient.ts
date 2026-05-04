/**
 * Canonical database client port. Implementations adapt this surface to a
 * concrete driver (postgres-js + Drizzle, in-memory test double). Consumers
 * — repositories, webhooks, apps — depend ONLY on this abstract class,
 * never on a concrete impl or a Drizzle query builder.
 *
 * A `DbClient` owns the connection pool / transport. Repositories (e.g.
 * `UserRepository`, `EmbeddingStore`) are separate ports that consume
 * *this* port at the infrastructure layer; they should not be confused
 * with low-level SQL access.
 *
 * Exposes exactly 4 methods:
 *   - `transaction<T>(fn)` — atomic unit of work with rollback on throw
 *   - `ping()` — liveness probe for `/health` endpoints
 *   - `close()` — graceful shutdown; drains the pool
 *   - `raw<T>(sql, params)` — escape hatch for bespoke SQL the port
 *     cannot model; prefer typed repositories wherever possible
 *
 * Drizzle-specific query-builder access is intentionally NOT on this
 * port. The Drizzle impl exposes it via a protected subclass accessor
 * used only by `Drizzle*RepositoryImpl` in the same infrastructure
 * folder, keeping the port driver-agnostic.
 */
export abstract class DbClient {
  /**
   * Execute `fn` inside a SQL transaction. The callback receives a
   * transaction-scoped `DbClient` whose repositories will observe the
   * transaction's isolation. Throws → rollback; returns → commit.
   *
   * Nested calls open SAVEPOINTs on Postgres-backed impls.
   */
  abstract transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>

  /**
   * Cheap round-trip to the server. Used by `/health` endpoints and
   * DI-time readiness checks. Resolves `true` on success; throws
   * (rather than resolving `false`) so callers observe the underlying
   * driver error.
   */
  abstract ping(): Promise<boolean>

  /**
   * Release all resources — connections, pool, pending timers. Call on
   * graceful shutdown (SIGTERM). After `close()` the instance MUST NOT
   * be used.
   */
  abstract close(): Promise<void>

  /**
   * Escape hatch for raw SQL. Prefer typed repositories; only reach for
   * this when the port cannot model the query (ad-hoc admin scripts,
   * extension-specific features). Parameters are bound positionally
   * (`$1`, `$2`, ...) to prevent injection.
   */
  abstract raw<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>
}
