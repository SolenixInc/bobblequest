import { trpcServer } from '@hono/trpc-server'
import { dependencyKeys } from '@t/dependency-injection'
import { errorHandler } from '@t/errors'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { buildContainer } from './composition'
import { installProcessHandlers } from './lifecycle'
import { createClerkAuthMiddleware } from './middleware/clerkAuth'
import { createRequestContextMiddleware } from './middleware/request-context'
import { appRouter } from './routers'
import { createBootstrapApp } from './routes/bootstrap'
import { createCronApp } from './routes/cron'
import { createClerkWebhookApp } from './routes/webhooks/clerk'
import { createRevenueCatWebhookApp } from './routes/webhooks/revenuecat'
import { createContext } from './trpc/context'

const container = buildContainer()
const logger = container.resolve(dependencyKeys.global.LOGGER)
const config = container.resolve(dependencyKeys.global.CONFIG)

// Wire process-level unhandledRejection / uncaughtException handlers.
installProcessHandlers(container)

const app = new Hono()

// 1. Global error handler — catches anything not handled inline.
app.onError(errorHandler)

// 2. CORS — must be first middleware so OPTIONS pre-flight responses are correct.
app.use(
  '*',
  cors({
    origin: config.system.corsOrigins,
    credentials: true,
  }),
)

// 3. Request-context middleware — mounted globally so every request (including
//    health checks and webhooks) gets a unique requestId, a child logger, and a
//    scoped analytics tracker. The errorHandler reads these from Hono context.
app.use('*', createRequestContextMiddleware(container))

// 4. Health check — intentionally BEFORE auth middleware so load-balancer
//    probes never require a Bearer token.
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

// 4b. Bootstrap probe — richer cousin of /health; reports env presence,
//     DI token resolution, and a DB ping. No auth required (same reasoning
//     as /health: must be reachable by CI without credentials).
app.route('/bootstrap', createBootstrapApp(container))

// 5. Webhooks — use their own signature/shared-secret verification.
app.route('/api/webhooks/clerk', createClerkWebhookApp(container))
app.route('/api/webhooks/revenuecat', createRevenueCatWebhookApp(container))

// 5b. Cron endpoints — use their own Bearer token verification (CRON_SECRET).
app.route('/api/cron', createCronApp(container))

// 6. Clerk Auth — optional auth that populates c.var.userId/user from Clerk JWT.
//    Mounted before tRPC so procedures can be protected or public.
app.use('/trpc/*', createClerkAuthMiddleware(container))

// 7. tRPC — receives pre-resolved auth/logger/analytics vars from Hono context.
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (opts, c) => createContext(opts, container, c),
    onError({ error }) {
      // Keep the per-request tRPC error log in addition to the global handler
      // because tRPC errors are caught internally and never reach app.onError.
      logger.error({ message: 'tRPC error', error })
    },
  }),
)

const port = config.system.port
logger.info({ message: `Server running on http://localhost:${port}` })

export default {
  port,
  fetch: app.fetch,
}
