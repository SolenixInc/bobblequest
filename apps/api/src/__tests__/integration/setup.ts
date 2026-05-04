/**
 * Shared integration-test harness for apps/api Phase A suites.
 *
 * Exports:
 *  - `buildTestApp()` — boots the same Hono app the production entrypoint
 *    mounts, but with `ENVIRONMENT=testing` so `buildContainer()` registers
 *    in-memory repos (NoopAuthProvider, InMemoryUserRepository, etc.).
 *  - `signedFetch()` — fires a Request against the test app with a forged
 *    Bearer token that satisfies `NoopAuthProvider.currentUser()`.
 *
 * Token forging notes:
 *  In `ENVIRONMENT=testing`, `registerAuthDI` registers `NoopAuthProvider`,
 *  which calls `currentUser(token)` and returns the canned stub user for any
 *  non-empty string token.  No JWT signature is verified; any non-empty ASCII
 *  string works as the Bearer value.  Integration tests that want a specific
 *  identity should call `buildTestApp()` and pass their own token string —
 *  the stub always resolves to `{ id: 'user_noop', email: 'noop@example.com' }`.
 *
 * Do NOT import from `../../index` (the production entrypoint): that module
 * has top-level side effects (buildContainer(), installProcessHandlers(),
 * Bun.serve()).  This file reproduces the same mount shape in a controlled,
 * side-effect-free way.
 */

import { trpcServer } from '@hono/trpc-server'
import { dependencyKeys } from '@t/dependency-injection'
import type { Container } from '@t/dependency-injection'
import { errorHandler } from '@t/errors'
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import { cors } from 'hono/cors'
import { buildContainer } from '../../composition'
import { createClerkAuthMiddleware } from '../../middleware/clerkAuth'
import { createRequestContextMiddleware } from '../../middleware/request-context'
import { appRouter } from '../../routers'
import { createBootstrapApp } from '../../routes/bootstrap'
import { createCronApp } from '../../routes/cron'
import { createClerkWebhookApp } from '../../routes/webhooks/clerk'
import { createRevenueCatWebhookApp } from '../../routes/webhooks/revenuecat'
import { createContext } from '../../trpc/context'

// ---------------------------------------------------------------------------
// Env bootstrap — mirror apps/api/src/__tests__/setup.ts so this file can
// stand alone (integration vitest project will have its own setup file that
// imports this, but tsc must compile it cleanly without the vitest project
// being present yet).
// ---------------------------------------------------------------------------
function ensureTestEnv(): void {
  process.env.ENVIRONMENT = 'testing'
  process.env.POSTHOG_API_KEY ??= 'phc_test_dummy'
  process.env.CLERK_SECRET_KEY ??= 'sk_test_dummy'
  process.env.CLERK_WEBHOOK_SECRET ??= 'whsec_dummy'
  process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/test'
  process.env.AI_SERVICE_URL ??= 'http://localhost:8000'
  process.env.METRICS_AUTH_TOKEN ??= 'test-metrics-token'
  process.env.SYSTEM_API_KEY ??= 'test-system-key'
  process.env.STRIPE_KEY ??= 'sk_test_dummy'
  process.env.STRIPE_REDIRECT_DOMAIN ??= 'http://localhost:3000'
  process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_stripe_dummy'
  process.env.APPLE_PRODUCTION_URL ??= 'https://buy.itunes.apple.com'
  process.env.APPLE_SANDBOX_URL ??= 'https://sandbox.itunes.apple.com'
  process.env.APPLE_APP_SHARED_SECRET ??= 'test-apple-secret'
  process.env.APP_STORE_BUNDLE_ID ??= 'com.example.test'
  process.env.APP_STORE_ENVIRONMENT ??= 'Sandbox'
  process.env.ANDROID_PUBLISHER_URL ??= 'https://androidpublisher.googleapis.com'
  process.env.CORE_REVENUE_CAT_API_KEY ??= 'test-rc-api-key'
  process.env.CORE_REVENUE_CAT_PROJECT_ID ??= 'test-rc-project'
  process.env.CORE_REVENUE_CAT_NUTRAFORGE_ENTITLEMENT_ID ??= 'test-entitlement'
  process.env.REVENUECAT_WEBHOOK_AUTH_HEADER ??= 'test-rc-webhook-secret'
  process.env.CRON_SECRET ??= 'test-cron-secret'
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The Hono app variable shape produced by this harness. */
type TestAppVariables = {
  userId: string | null
  user: {
    id: string
    role: string | null
    email: string | null
  } | null
}

/** The full Hono application type used in this harness. */
type TestHonoApp = Hono<{ Variables: TestAppVariables }>

/**
 * Return value of `buildTestApp()`.
 *
 * - `app`        — the raw Hono instance; use `app.request()` for low-level
 *                  fetch-style assertions.
 * - `container`  — the DI container so tests can resolve in-memory repos and
 *                  seed state directly (e.g. `container.resolve(dependencyKeys.global.USER_REPOSITORY)`).
 * - `client`     — a typed hono testClient; ergonomic for tRPC-over-HTTP
 *                  integration calls.
 */
export interface TestApp {
  app: TestHonoApp
  container: Container
  client: ReturnType<typeof testClient<TestHonoApp>>
}

// ---------------------------------------------------------------------------
// buildTestApp
// ---------------------------------------------------------------------------

/**
 * Boots a fully-wired Hono app with `ENVIRONMENT=testing`.
 *
 * - Auth: `NoopAuthProvider` — any non-empty Bearer token resolves to the
 *   canned stub user `{ id: 'user_noop', email: 'noop@example.com', role: null }`.
 * - DB: `InMemoryUserRepository` / `InMemoryProjectRepository` (registered by
 *   `registerDbDI` when `environment === 'testing'`).
 * - Cache/Queue: no-op stubs; `.ping()` returns `true`.
 *
 * Mount order exactly mirrors `apps/api/src/index.ts`:
 *   1. Global error handler
 *   2. CORS
 *   3. Request-context middleware
 *   4. /health
 *   4b. /bootstrap
 *   5. Webhooks
 *   5b. Cron
 *   6. Clerk auth middleware (on /trpc/*)
 *   7. tRPC
 */
export function buildTestApp(): TestApp {
  ensureTestEnv()

  const container = buildContainer()
  const config = container.resolve(dependencyKeys.global.CONFIG)
  const logger = container.resolve(dependencyKeys.global.LOGGER)

  const app: TestHonoApp = new Hono<{ Variables: TestAppVariables }>()

  // 1. Global error handler
  app.onError(errorHandler)

  // 2. CORS
  app.use(
    '*',
    cors({
      origin: config.system.corsOrigins,
      credentials: true,
    }),
  )

  // 3. Request-context middleware
  app.use('*', createRequestContextMiddleware(container))

  // 4. Health check
  app.get('/health', async (c) => {
    const [dbOk, cacheOk] = await Promise.all([
      container
        .resolve(dependencyKeys.global.DB)
        .ping()
        .catch(() => false),
      container
        .resolve(dependencyKeys.global.CACHE)
        .ping()
        .catch(() => false),
    ])

    const status = dbOk && cacheOk ? 'ok' : 'error'
    const code = dbOk && cacheOk ? 200 : 503

    return c.json(
      {
        status,
        timestamp: new Date().toISOString(),
        details: {
          db: dbOk ? 'ok' : 'error',
          cache: cacheOk ? 'ok' : 'error',
        },
      },
      code,
    )
  })

  // 4b. Bootstrap probe
  app.route('/bootstrap', createBootstrapApp(container))

  // 5. Webhooks
  app.route('/api/webhooks/clerk', createClerkWebhookApp(container))
  app.route('/api/webhooks/revenuecat', createRevenueCatWebhookApp(container))

  // 5b. Cron endpoints
  app.route('/api/cron', createCronApp(container))

  // 6. Clerk auth middleware
  app.use('/trpc/*', createClerkAuthMiddleware(container))

  // 7. tRPC
  app.use(
    '/trpc/*',
    trpcServer({
      router: appRouter,
      createContext: (opts, c) => createContext(opts, container, c),
      onError({ error }) {
        logger.error({ message: 'tRPC error', error })
      },
    }),
  )

  const client = testClient(app)

  return { app, container, client }
}

// ---------------------------------------------------------------------------
// signedFetch
// ---------------------------------------------------------------------------

/**
 * Options for {@link signedFetch}.
 */
export interface SignedFetchOptions {
  /**
   * Bearer token value (everything after "Bearer ").
   *
   * In `ENVIRONMENT=testing` any non-empty string satisfies `NoopAuthProvider`.
   * Defaults to `"test-token"`.
   */
  token?: string
  /** HTTP method. Defaults to `"GET"`. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Absolute path, e.g. `"/health"` or `"/trpc/user.me"`. */
  path: string
  /**
   * Optional request body.  Will be JSON-serialized and sent with
   * `Content-Type: application/json`.
   */
  body?: unknown
}

/**
 * Fires a request against the test Hono app with an `Authorization: Bearer`
 * header so the `clerkAuth` middleware populates `c.var.userId` / `c.var.user`.
 *
 * The default token `"test-token"` satisfies `NoopAuthProvider`, which resolves
 * any non-empty string to the stub user `{ id: 'user_noop', email: 'noop@example.com' }`.
 *
 * @returns The raw `Response` — callers assert `.status` and call `.json()`.
 */
export async function signedFetch(
  app: TestHonoApp,
  { token = 'test-token', method = 'GET', path, body }: SignedFetchOptions,
): Promise<Response> {
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
  })

  let bodyInit: string | undefined

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    bodyInit = JSON.stringify(body)
  }

  return app.request(path, {
    method,
    headers,
    body: bodyInit,
  })
}
