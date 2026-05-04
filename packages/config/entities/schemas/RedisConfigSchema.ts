import { z } from 'zod'

/**
 * Schema for Redis cache configuration.
 *
 * Supports two connection styles (prefer `url` when set):
 * 1. Full connection URL via `REDIS_URL`
 * 2. Discrete fields via `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`, `REDIS_DB`
 *
 * **Environment Variables:**
 * - `REDIS_URL` — full connection URL (e.g. `redis://user:pass@host:6379/0`), optional if discrete fields provided
 * - `REDIS_HOST` — Redis host (default: `localhost`)
 * - `REDIS_PORT` — Redis port (default: `6379`)
 * - `REDIS_PASSWORD` — Redis password (optional)
 * - `REDIS_TLS` — enable TLS (`true` / `false`, default: `false`)
 * - `REDIS_DB` — Redis database index (default: `0`)
 */
export const RedisConfigSchema = z.object({
  /**
   * Full Redis connection URL.
   *
   * When set, takes precedence over the discrete host/port/password/tls/db
   * fields. Useful for managed providers (Upstash, Redis Cloud) that hand
   * out a single connection string.
   *
   * **Environment Variable:** `REDIS_URL`
   */
  url: z
    .string()
    .optional()
    .describe('Full Redis connection URL (takes precedence over discrete fields)'),

  /**
   * Redis host.
   *
   * **Environment Variable:** `REDIS_HOST`
   */
  host: z.string().default('localhost').describe('Redis host'),

  /**
   * Redis port.
   *
   * **Environment Variable:** `REDIS_PORT`
   */
  port: z.number().int().positive().default(6379).describe('Redis port'),

  /**
   * Redis password.
   *
   * Optional — omit for unauthenticated local instances.
   *
   * **Environment Variable:** `REDIS_PASSWORD`
   */
  password: z.string().optional().describe('Redis password'),

  /**
   * Enable TLS for the Redis connection.
   *
   * **Environment Variable:** `REDIS_TLS`
   */
  tls: z.boolean().default(false).describe('Enable TLS for Redis connection'),

  /**
   * Redis database index.
   *
   * **Environment Variable:** `REDIS_DB`
   */
  db: z.number().int().nonnegative().default(0).describe('Redis database index'),
})

/**
 * Type inferred from RedisConfigSchema.
 */
export type RedisConfig = z.infer<typeof RedisConfigSchema>

/**
 * Resolves Redis configuration from a process environment record.
 *
 * Maps the `REDIS_*` env vars into the shape expected by
 * {@link RedisConfigSchema} and runs it through `.parse()` so schema
 * defaults and validation apply uniformly.
 *
 * Coercion rules:
 * - `REDIS_PORT` / `REDIS_DB` — parsed as base-10 integers; unset → schema default applies
 * - `REDIS_TLS` — `"true"`, `"1"`, or `"yes"` (case-insensitive) → `true`; any other value → `false`
 */
export function resolveRedisConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): RedisConfig {
  const rawTls = env.REDIS_TLS?.trim().toLowerCase()
  const tls = rawTls === 'true' || rawTls === '1' || rawTls === 'yes'

  const rawPort = env.REDIS_PORT ? Number.parseInt(env.REDIS_PORT, 10) : undefined
  const rawDb = env.REDIS_DB ? Number.parseInt(env.REDIS_DB, 10) : undefined

  return RedisConfigSchema.parse({
    url: env.REDIS_URL || undefined,
    host: env.REDIS_HOST || undefined,
    port: rawPort,
    password: env.REDIS_PASSWORD || undefined,
    tls,
    db: rawDb,
  })
}
