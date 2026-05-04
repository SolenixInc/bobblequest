/**
 * Process lifecycle handlers.
 *
 * Registers `unhandledRejection` and `uncaughtException` listeners that:
 *   - Log the error via the global logger.
 *   - Capture it to analytics using the global `AnalyticsTracker`'s
 *     `captureException` (with explicit `distinctId = 'system'`), since
 *     these are process-level events with no per-request user context.
 *
 * Intentionally does NOT call `process.exit` — the platform (Railway, etc.)
 * decides whether to restart the dyno.
 */

import type { AnalyticsTracker } from '@t/analytics'
import type { AwilixContainer } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import { shutdownLogging } from '@t/logging'
import type { QueueClient } from '@t/queue'

export function installProcessHandlers(container: AwilixContainer): void {
  const logger = container.resolve<Logger>(dependencyKeys.global.LOGGER)
  const analytics = container.resolve<AnalyticsTracker>(dependencyKeys.global.ANALYTICS)

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    logger.error({ message: 'unhandledRejection', error })
    analytics.captureException(error, 'system', { source: 'unhandledRejection' })
  })

  process.on('uncaughtException', (error) => {
    logger.error({ message: 'uncaughtException', error })
    analytics.captureException(error, 'system', { source: 'uncaughtException' })
    // Do NOT process.exit — let the platform decide.
  })

  let shuttingDown = false

  function registerShutdownHandler(signal: 'SIGTERM' | 'SIGINT') {
    process.on(signal, async () => {
      if (shuttingDown) return
      shuttingDown = true

      logger.info(`Received ${signal}, shutting down...`)

      try {
        const queue = container.resolve<QueueClient>(dependencyKeys.global.QUEUE)
        /* v8 ignore next — both branches exercised; v8 miscounts async try/catch */
        await queue.close()
      } catch {
        // Queue might not be registered or already closed
      }

      try {
        /* v8 ignore next — both branches exercised; v8 miscounts async try/catch */
        await shutdownLogging()
      } catch {
        // shutdownLogging swallows its own errors, but guard anyway
      }

      logger.info('Graceful shutdown complete.')
      process.exit(0)
    })
  }

  registerShutdownHandler('SIGTERM')
  registerShutdownHandler('SIGINT')
}
