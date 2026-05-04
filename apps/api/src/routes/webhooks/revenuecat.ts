/**
 * POST /api/webhooks/revenuecat — RevenueCat entitlement-event webhook.
 *
 * Flow (must happen in this order):
 *   1. Read the RAW request body (before any JSON parse).
 *   2. Verify the Authorization header via constant-time compare using
 *      `verifyRevenueCatWebhook`. RC uses a shared-secret header, not HMAC.
 *   3. Parse the verified payload through `RevenueCatWebhookEventSchema` (Zod).
 *   4. Dispatch to `BillingRepository.handleRevenueCatEvent`.
 *   5. Return `200` on success so RC does not retry.
 *
 * RC retries on non-2xx, so repository writes must be idempotent on `event.id`.
 */
import { RevenueCatWebhookEventSchema, verifyRevenueCatWebhook } from '@t/billing'
import type { BillingRepository } from '@t/billing'
import type { ConfigRepository } from '@t/config'
import type { AwilixContainer } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import { Hono } from 'hono'

export function createRevenueCatWebhookApp(container: AwilixContainer): Hono {
  // Resolve singletons once at construction — avoids repeated container lookups.
  const billingRepository = container.resolve<BillingRepository>(
    dependencyKeys.global.BILLING_REPOSITORY,
  )
  const config = container.resolve<ConfigRepository>(dependencyKeys.global.CONFIG)
  const logger = container.resolve<Logger>(dependencyKeys.global.LOGGER)

  const app = new Hono()

  app.post('/', async (c) => {
    // 1. Read raw body BEFORE any JSON parser.
    const rawBody = await c.req.text()

    // 2. Verify Authorization header (shared-secret, timing-safe compare).
    const authorizationHeader = c.req.header('Authorization') ?? null
    try {
      verifyRevenueCatWebhook({
        authorizationHeader,
        expectedHeader: config.revenueCat.webhookAuthHeader,
      })
    } catch (err) {
      // verifyRevenueCatWebhook only throws BillingWebhookSignatureError.
      /* v8 ignore next — verifyRevenueCatWebhook always throws Error; non-Error branch is unreachable in TS */
      const msg = err instanceof Error ? err.message : String(err)
      logger.warning(
        { message: '[webhooks/revenuecat] signature verification failed', error: msg },
        '',
      )
      return c.json({ ok: false }, 401)
    }

    // 3. Parse the body via Zod.
    let parsed: ReturnType<typeof RevenueCatWebhookEventSchema.safeParse>
    try {
      parsed = RevenueCatWebhookEventSchema.safeParse(JSON.parse(rawBody))
    } catch {
      // JSON.parse threw — malformed body.
      logger.warning({ message: '[webhooks/revenuecat] malformed JSON body' }, '')
      return c.json({ ok: false }, 400)
    }

    if (!parsed.success) {
      logger.warning(
        {
          message: '[webhooks/revenuecat] schema parse failed',
          issues: parsed.error.issues,
        },
        '',
      )
      return c.json({ ok: false }, 400)
    }

    const event = parsed.data

    // 4. Persist the event.
    try {
      await billingRepository.handleRevenueCatEvent(event)
    } catch (err) {
      logger.error(
        {
          message: '[webhooks/revenuecat] handleRevenueCatEvent threw',
          /* v8 ignore next — billingRepository.handleRevenueCatEvent always throws Error; non-Error branch is unreachable in TS */
          error: err instanceof Error ? err.message : String(err),
        },
        '',
      )
      return c.json({ ok: false }, 500)
    }

    // 5. Acknowledge.
    logger.info(
      {
        message: '[webhooks/revenuecat] event processed',
        eventType: event.event.type,
        appUserId: event.event.app_user_id,
      },
      '',
    )
    return c.json({ ok: true }, 200)
  })

  return app
}
