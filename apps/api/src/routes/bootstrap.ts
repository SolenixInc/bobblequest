/**
 * GET /bootstrap — stack-verification probe.
 *
 * Reports presence (never values) of env vars, DI token resolution status,
 * and a DB liveness ping. Always returns HTTP 200 — the caller inspects the
 * JSON body to determine pass/fail. Intentionally placed before auth
 * middleware (like /health) so CI health-checks don't need a Bearer token.
 *
 * JSON shape:
 * {
 *   app: "api",
 *   version: string,          // from package.json
 *   uptime: number,           // process.uptime() seconds
 *   timestamp: string,        // ISO 8601
 *   env: Record<string, "set" | "missing">,
 *   di: { tokens: string[], failed: string[] },
 *   db: "ok" | { error: string }
 * }
 */
import type { DbClient } from '@t/db'
import type { AwilixContainer } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import { Hono } from 'hono'
import { version } from '../../package.json' with { type: 'json' }

// ---------------------------------------------------------------------------
// Env vars reported by the api app (presence-only — values are NEVER emitted)
// ---------------------------------------------------------------------------

const TRACKED_ENV_VARS = [
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_WEBHOOK_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'REDIS_HOST',
  'POSTHOG_API_KEY',
  'STRIPE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CORE_REVENUE_CAT_API_KEY',
  'REVENUECAT_WEBHOOK_AUTH_HEADER',
  'ENVIRONMENT',
  'PORT',
] as const

type EnvReport = Record<(typeof TRACKED_ENV_VARS)[number], 'set' | 'missing'>

// ---------------------------------------------------------------------------
// DI tokens to probe
// ---------------------------------------------------------------------------

const DI_TOKENS = Object.values(dependencyKeys.global)

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createBootstrapApp(container: AwilixContainer): Hono {
  const app = new Hono()

  app.get('/', async (c) => {
    // --- env presence (never log/emit values) ---
    const env = Object.fromEntries(
      TRACKED_ENV_VARS.map((key) => [key, process.env[key] ? 'set' : 'missing']),
    ) as EnvReport

    // --- DI introspection ---
    const resolvedTokens: string[] = []
    const failedTokens: string[] = []
    for (const token of DI_TOKENS) {
      try {
        container.resolve(token)
        resolvedTokens.push(token)
      } catch {
        failedTokens.push(token)
      }
    }

    // --- DB ping ---
    let db: 'ok' | { error: string }
    try {
      const dbClient = container.resolve<DbClient>(dependencyKeys.global.DB)
      await dbClient.ping()
      db = 'ok'
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Trim to a short, non-sensitive summary — never expose query internals
      db = { error: message.slice(0, 120) }
    }

    return c.json({
      app: 'api',
      version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env,
      di: { tokens: resolvedTokens, failed: failedTokens },
      db,
    })
  })

  return app
}
