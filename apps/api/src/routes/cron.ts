/**
 * POST /api/cron — cron job trigger endpoint.
 *
 * Validates the `x-cron-secret` header against the configured `cronSecret`
 * using a constant-time comparison. Returns 200 on success, 403 on failure.
 *
 * Intended to be called by an external cron scheduler (e.g., Vercel Cron,
 * GitHub Actions scheduled workflow) that possesses the shared secret.
 */
import type { AwilixContainer } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import { Hono } from 'hono'
import { timingSafeEqual } from 'node:crypto'

export function createCronApp(container: AwilixContainer): Hono {
  const config = container.resolve<{
    system: { cronSecret: string }
  }>(dependencyKeys.global.CONFIG)
  const logger = container.resolve<Logger>(dependencyKeys.global.LOGGER)

  const app = new Hono()

  app.post('/', async (c) => {
    const providedSecret = c.req.header('x-cron-secret') ?? ''
    const expectedSecret = config.system.cronSecret

    // Constant-time compare; early-out on length mismatch to avoid
    // passing unequal-length buffers to timingSafeEqual (which throws).
    if (
      providedSecret.length !== expectedSecret.length ||
      !timingSafeEqual(Buffer.from(providedSecret), Buffer.from(expectedSecret))
    ) {
      logger.warning({ message: '[cron] invalid or missing x-cron-secret' }, '')
      return c.json({ ok: false }, 403)
    }

    logger.info({ message: '[cron] job triggered successfully' }, '')
    return c.json({ ok: true }, 200)
  })

  return app
}
