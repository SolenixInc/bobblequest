import { z } from 'zod'

/**
 * Schema for database (Postgres + pgvector) configuration.
 *
 * Consumed by `@t/db`'s `registerDbDI` to construct the Drizzle +
 * postgres-js client. Railway exposes `DATABASE_URL` on the Postgres
 * service; locally the dev can set it to a docker-run pgvector image.
 *
 * **Environment Variables:**
 * - `DATABASE_URL` — full Postgres connection URL (e.g. `postgres://user:pass@host:5432/db?sslmode=require`)
 * - `DATABASE_MAX_CONNECTIONS` — pool size hint (default: `10`)
 * - `DATABASE_PREPARE` — whether to use prepared statements (`true` / `false`, default: `false` — required behind pgbouncer transaction-mode pools like Railway's default)
 */
export const DbConfigSchema = z.object({
  /**
   * Full Postgres connection URL.
   *
   * Railway injects this automatically on services linked to a
   * Postgres add-on. For local dev, point at a pgvector-enabled
   * docker image (e.g. `pgvector/pgvector:pg17`).
   *
   * **Environment Variable:** `DATABASE_URL`
   */
  url: z.string().min(1).describe('Full Postgres connection URL'),

  /**
   * Maximum concurrent connections in the postgres-js pool.
   *
   * **Environment Variable:** `DATABASE_MAX_CONNECTIONS`
   */
  maxConnections: z.number().int().positive().default(10).describe('Postgres connection pool size'),

  /**
   * Whether to use prepared statements.
   *
   * `false` is required behind pgbouncer transaction-mode proxies
   * (Railway's default). Set to `true` only when connecting directly
   * to Postgres or through a session-mode pooler.
   *
   * **Environment Variable:** `DATABASE_PREPARE`
   */
  prepare: z.boolean().default(false).describe('Enable prepared statements'),
})

/**
 * Type inferred from DbConfigSchema.
 */
export type DbConfig = z.infer<typeof DbConfigSchema>

/**
 * Resolves database configuration from a process environment record.
 *
 * Maps the `DATABASE_*` env vars into the shape expected by
 * {@link DbConfigSchema} and runs it through `.parse()` so schema
 * defaults and validation apply uniformly.
 *
 * Coercion rules:
 * - `DATABASE_MAX_CONNECTIONS` — parsed as base-10 integer; unset → schema default applies
 * - `DATABASE_PREPARE` — `"true"`, `"1"`, or `"yes"` (case-insensitive) → `true`; any other value → `false`
 */
export function resolveDbConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): DbConfig {
  const rawPrepare = env.DATABASE_PREPARE?.trim().toLowerCase()
  const prepare = rawPrepare === 'true' || rawPrepare === '1' || rawPrepare === 'yes'

  const rawMax = env.DATABASE_MAX_CONNECTIONS
    ? Number.parseInt(env.DATABASE_MAX_CONNECTIONS, 10)
    : undefined

  return DbConfigSchema.parse({
    url: env.DATABASE_URL,
    maxConnections: rawMax,
    prepare,
  })
}
