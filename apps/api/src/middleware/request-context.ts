/**
 * Request-context middleware.
 *
 * This module provides middleware to populate per-request context variables:
 *   1. `requestId` & `logger` (via `createRequestTraceMiddleware`)
 *   2. `analytics` (via `createAnalyticsMiddleware`)
 *
 * This split allows `clerkAuth` to run between them, ensuring the analytics
 * tracker is correctly identified with the `userId` while still giving
 * `clerkAuth` access to the per-request logger.
 */

import type { AnalyticsTracker } from '@t/analytics'
import type { RequestAnalyticsTracker } from '@t/analytics'
import type { ConfigRepository } from '@t/config'
import type { AwilixContainer } from '@t/dependency-injection'
import { asValue, dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import type { MiddlewareHandler } from 'hono'

/** Hono context variables injected by these middlewares. */
export interface RequestContextVariables {
  requestId: string
  logger: Logger
  analytics: RequestAnalyticsTracker
  /** Runtime environment string sourced from ConfigRepository.
   * Consumed by errorHandler to decide whether to include stack traces. */
  environment: string
}

/**
 * Populates `requestId`, `logger`, and `environment`.
 * Should be mounted early in the middleware stack.
 */
export function createRequestTraceMiddleware(container: AwilixContainer): MiddlewareHandler<{
  Variables: Pick<RequestContextVariables, 'requestId' | 'logger' | 'environment'>
}> {
  // Resolve environment once at factory time — it never changes per-request.
  /* v8 ignore next — ConfigValuesSchema ensures system.environment is always set */
  const environment: string = container.resolve<ConfigRepository>(dependencyKeys.global.CONFIG)
    .system.environment

  return async (c, next) => {
    const requestId = crypto.randomUUID()

    // ── Logger ──────────────────────────────────────────────────────────────
    // Resolve the factory (registered as a singleton that IS the factory fn).
    const loggerFactory = container.resolve<
      (opts: { requestId: string; metadata?: Record<string, unknown> }) => Logger
    >(dependencyKeys.global.LOGGER_FACTORY)

    const childLogger = loggerFactory({
      requestId,
      metadata: {
        method: c.req.method,
        path: c.req.path,
      },
    })

    // ── Hono context ────────────────────────────────────────────────────────
    c.set('requestId', requestId)
    c.set('logger', childLogger)
    c.set('environment', environment)
    c.header('X-Request-ID', requestId)

    await next()
  }
}

/**
 * Populates `analytics`.
 * Should be mounted AFTER `createRequestTraceMiddleware` and `clerkAuth`.
 */
export function createAnalyticsMiddleware(
  container: AwilixContainer,
): MiddlewareHandler<{ Variables: Pick<RequestContextVariables, 'analytics'> }> {
  return async (c, next) => {
    const vars = c.var as Record<string, unknown>
    const requestId = vars.requestId as string
    const userId = vars.userId as string | undefined

    const sessionIdFromHeader = c.req.header('x-posthog-session-id')
    const distinctIdFromHeader = c.req.header('x-posthog-distinct-id')
    const projectIdFromHeader = c.req.header('x-project-id')

    // ── Analytics ───────────────────────────────────────────────────────────
    // Create a child awilix scope and seed it with the per-request bindings
    // that RequestAnalyticsTrackerImpl's constructor expects.
    const scope = container.createScope()

    // Always register every optional constructor parameter that
    // RequestAnalyticsTrackerImpl declares, even as undefined. Awilix resolves
    // constructor params by name and throws AwilixResolutionError when a name
    // is absent from the scope — TypeScript's `?` optional marker does not
    // carry over to Awilix's runtime resolution.
    scope.register({
      [dependencyKeys.global.ANALYTICS]: asValue(
        container.resolve<AnalyticsTracker>(dependencyKeys.global.ANALYTICS),
      ),
      parent: asValue(container.resolve<AnalyticsTracker>(dependencyKeys.global.ANALYTICS)),
      requestId: asValue(requestId),
      userId: asValue(userId ?? undefined),
      sessionIdFromHeader: asValue(sessionIdFromHeader ?? undefined),
      distinctIdFromHeader: asValue(distinctIdFromHeader ?? undefined),
      groupKey: asValue(projectIdFromHeader ?? undefined),
    })

    const analytics = scope.resolve<RequestAnalyticsTracker>(
      dependencyKeys.request.REQUEST_ANALYTICS,
    )

    c.set('analytics', analytics)

    await next()
  }
}

/**
 * LEGACY: Combined middleware.
 * Use split version for better auth integration.
 */
export function createRequestContextMiddleware(
  container: AwilixContainer,
): MiddlewareHandler<{ Variables: RequestContextVariables }> {
  return async (c, next) => {
    const traceMiddleware = createRequestTraceMiddleware(container)
    const analyticsMiddleware = createAnalyticsMiddleware(container)

    await (traceMiddleware as unknown as MiddlewareHandler)(c, async () => {
      await (analyticsMiddleware as unknown as MiddlewareHandler)(c, next)
    })
  }
}
