import { sql } from 'drizzle-orm'
import { type PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import { DbClient } from '../../entities/ports/DbClient.ts'
import * as schema from '../../entities/schemas/index.ts'

/**
 * Options bag for {@link DrizzleDbClientImpl}. Accepts either an
 * existing `postgres` client (handy for tests / shared pools) or a
 * raw connection URL the impl will turn into a client on construction.
 */
export interface DrizzleDbClientOptions {
  /** Prebuilt `postgres-js` client. Takes precedence over `url`. */
  readonly client?: Sql
  /**
   * `DATABASE_URL` from `@t/config`. Required when `client` is absent.
   * Format: `postgres://user:pass@host:5432/db?sslmode=require`.
   */
  readonly url?: string
  /**
   * Pool size hint. `postgres-js` defaults to 10; Railway proxies tend
   * to handle more comfortably. Ignored when `client` is supplied.
   */
  readonly max?: number
  /**
   * `prepare: false` is required behind pgbouncer transaction-mode
   * pools (Railway's default). Defaults to `false` for safety.
   * Set to `true` only when talking to a session-mode pooler or
   * directly to Postgres.
   */
  readonly prepare?: boolean
}

/**
 * Drizzle-backed `DbClient` using the `postgres-js` driver.
 *
 * Chose `postgres-js` over `node-postgres` for:
 *   - first-class Bun support (ships as a dep in Bun's `bun:sqlite`
 *     / `postgres-js` combo) and Vercel/edge runtimes
 *   - tagged-template query ergonomics in the `raw()` escape hatch
 *   - smaller dependency footprint (no native bindings)
 *
 * Drizzle's postgres-js adapter is the reference path in the docs.
 *
 * Schema-level re-export of every table keeps relational queries
 * type-safe without the impl having to list tables individually.
 */
export class DrizzleDbClientImpl extends DbClient {
  protected readonly client: Sql
  protected readonly db: PostgresJsDatabase<typeof schema>

  constructor(opts: DrizzleDbClientOptions) {
    super()
    if (opts.client) {
      this.client = opts.client
    } else {
      if (!opts.url) {
        throw new TypeError('DrizzleDbClientImpl: either `client` or `url` is required')
      }
      this.client = postgres(opts.url, {
        max: opts.max ?? 10,
        prepare: opts.prepare ?? false,
      })
    }
    this.db = drizzle(this.client, { schema })
  }

  /**
   * Accessor for the Drizzle query builder, used by in-package
   * repository impls (`DrizzleUserRepositoryImpl`,
   * `DrizzleEmbeddingStoreImpl`). Intentionally `protected`-flavoured
   * via the separate getter — consumers outside this package must go
   * through repositories, not the raw builder.
   */
  getDrizzle(): PostgresJsDatabase<typeof schema> {
    return this.db
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      // Wrap the tx-scoped Drizzle object in a minimal DbClient view.
      // Repositories that need the tx go through `getDrizzle()` on the
      // supplied child; `close()` on a tx child is a no-op (the outer
      // client owns the pool).
      //
      // IMPORTANT: `raw()` must route through the transaction's postgres-js
      // client, not the outer pool. Drizzle's PostgresJsTransaction exposes
      // the tx-scoped `Sql` at `tx.session.client` — extract it so that
      // `child.raw()` participates in the same BEGIN/ROLLBACK envelope.
      // Without this, raw() calls commit immediately and are not rolled back.
      const txSql = (tx as unknown as { session?: { client?: Sql } }).session?.client ?? this.client
      const child = Object.create(this) as DrizzleDbClientImpl
      ;(child as unknown as { db: unknown }).db = tx
      ;(child as unknown as { client: unknown }).client = txSql
      // Neutralize `close()` so a misbehaving callback can't drain the
      // outer pool mid-transaction.
      ;(child as unknown as { close: () => Promise<void> }).close = async () => {}
      return fn(child)
    })
  }

  async ping(): Promise<boolean> {
    const rows = await this.db.execute<{ ok: number }>(sql`select 1 as ok`)
    return Array.isArray(rows) ? rows.length > 0 : true
  }

  async close(): Promise<void> {
    await this.client.end({ timeout: 5 })
  }

  async raw<T = Record<string, unknown>>(
    query: string,
    params: readonly unknown[] = [],
  ): Promise<T[]> {
    // `postgres-js` uses tagged templates; `unsafe` accepts a plain string
    // + positional bindings, which is exactly what our port promises.
    // postgres-js `unsafe` expects `ParameterOrJSON<never>[]`; our port allows
    // `readonly unknown[]`. The cast is sound because the port contract requires
    // callers to pass only SQL-serializable values.
    const result = await this.client.unsafe<T[]>(
      query,
      params as Parameters<typeof this.client.unsafe>[1],
    )
    return result as T[]
  }
}
