import type { RequestLogger } from '@t/logging'
import type { Logger } from '@t/logging'
import type { ErrorHandlerAnalytics } from './errorHandler.ts'

/**
 * Augments Hono's ContextVariableMap so consumers get type-safe c.get() /
 * c.set() calls for the error-handler context contract without needing
 * explicit generic casts.
 *
 * To activate: import this file (or the package barrel) in the file where
 * your Hono app is constructed. The augmentation is ambient — it applies
 * to all Hono Context instances in the same TS project.
 *
 * @example
 * ```ts
 * // apps/api/src/index.ts
 * import '@t/errors/delivery/hono' // activate augmentation
 * import { Hono } from 'hono'
 *
 * const app = new Hono()
 * app.use(async (c, next) => {
 *   c.set('requestId', crypto.randomUUID()) // ✓ typed
 *   await next()
 * })
 * ```
 */
declare module 'hono' {
  interface ContextVariableMap {
    requestId?: string
    logger?: RequestLogger | Logger
    analytics?: ErrorHandlerAnalytics
  }
}
