/**
 * POST /api/webhooks/clerk — Clerk user-lifecycle webhook.
 *
 * Flow (must happen in this order):
 *   1. Read the RAW request body (before any JSON parser).
 *   2. Verify the svix signature against `CLERK_WEBHOOK_SECRET` using the
 *      `svix-id`, `svix-timestamp`, and `svix-signature` headers.
 *   3. Parse the verified payload through `WebhookEventSchema` (zod).
 *   4. Dispatch on `event.type` — upsert / delete the mirrored `users` row
 *      via the DI'd `UserRepository`, and emit a log line.
 *   5. Return `200` on success so svix does not retry.
 *
 * svix retries on non-2xx responses, so repository writes must be idempotent
 * on `clerk_user_id` (the schema marks that column UNIQUE).
 */
import type { AuthProvider } from '@t/auth'
import type { WebhookEvent } from '@t/auth'
import type { UserRepository } from '@t/db'
import type { AwilixContainer } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import { Hono } from 'hono'
import { Webhook } from 'svix'
import { z } from 'zod'

/**
 * Narrow Zod view over the three Clerk user-lifecycle events the app
 * consumes. Other event types (`session.*`, `email.*`, ...) parse as
 * `{ type: string }` and are acknowledged with a 200 no-op.
 *
 * NOTE: `@t/auth` exports `WebhookEventSchema` with the same three member
 * schemas but its `UserEventDataSchema` also includes `created_at` / `updated_at`
 * numeric fields not present in the local copy. These timestamps are not
 * needed for the mirror write, so the local schema intentionally omits them.
 * If `@t/auth`'s schema gains additional required fields, update both.
 */
const EmailAddressSchema = z.object({
  id: z.string(),
  email_address: z.string().email(),
})

const UserDataSchema = z.object({
  id: z.string().min(1),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  primary_email_address_id: z.string().nullable().optional(),
  email_addresses: z.array(EmailAddressSchema).default([]),
  public_metadata: z.record(z.unknown()).optional(),
})

const UserDeletedDataSchema = z.object({
  id: z.string().min(1),
  deleted: z.literal(true).optional(),
})

export const ClerkUserCreatedEventSchema = z.object({
  type: z.literal('user.created'),
  data: UserDataSchema,
})
export const ClerkUserUpdatedEventSchema = z.object({
  type: z.literal('user.updated'),
  data: UserDataSchema,
})
export const ClerkUserDeletedEventSchema = z.object({
  type: z.literal('user.deleted'),
  data: UserDeletedDataSchema,
})

export const ClerkWebhookEventSchema = z.discriminatedUnion('type', [
  ClerkUserCreatedEventSchema,
  ClerkUserUpdatedEventSchema,
  ClerkUserDeletedEventSchema,
])

export type ClerkUserCreatedEvent = z.infer<typeof ClerkUserCreatedEventSchema>
export type ClerkUserUpdatedEvent = z.infer<typeof ClerkUserUpdatedEventSchema>
export type ClerkUserDeletedEvent = z.infer<typeof ClerkUserDeletedEventSchema>
export type ClerkWebhookEvent = z.infer<typeof ClerkWebhookEventSchema>

/**
 * Svix verification helper. Isolated so tests can stub the underlying `svix`
 * client without touching the route definition.
 *
 * @throws when signature verification fails — the caller must convert this
 *         into a 400 response so svix retries with backoff.
 */
export function verifyClerkWebhook(
  payload: string,
  headers: { 'svix-id': string; 'svix-timestamp': string; 'svix-signature': string },
  secret: string,
): unknown {
  const wh = new Webhook(secret)
  return wh.verify(payload, headers)
}

/**
 * Extracts the primary email from a Clerk user event payload. Falls back to
 * the first email on the record if `primary_email_address_id` is unset.
 */
function pickPrimaryEmail(data: ClerkUserCreatedEvent['data']): string | null {
  const primaryId = data.primary_email_address_id ?? null
  if (primaryId) {
    const match = data.email_addresses.find((e) => e.id === primaryId)
    if (match) return match.email_address
  }
  return data.email_addresses[0]?.email_address ?? null
}

function composeDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null {
  const parts = [firstName, lastName].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  )
  return parts.length > 0 ? parts.join(' ') : null
}

/**
 * Factory that creates the Hono sub-app mounted at `/api/webhooks/clerk`.
 *
 * Resolves `USER_REPOSITORY`, `AUTH`, and `LOGGER` from the Awilix container
 * once at construction time — no per-request resolution overhead.
 *
 * Deliberately written without tRPC: svix requires the untouched raw body for
 * HMAC verification, and the route returns plain HTTP status codes rather
 * than tRPC error envelopes.
 *
 * Back-compat note for index.ts: the default export is now a Hono app built
 * from a no-arg stub container suitable only for testing without DI. In
 * production, call `createClerkWebhookApp(container)` directly and mount the
 * returned app. Update `apps/api/src/index.ts` to:
 *
 *   import { createClerkWebhookApp } from './routes/webhooks/clerk'
 *   app.route('/api/webhooks/clerk', createClerkWebhookApp(container))
 */
export function createClerkWebhookApp(container: AwilixContainer): Hono {
  const userRepository = container.resolve<UserRepository>(dependencyKeys.global.USER_REPOSITORY)
  const auth = container.resolve<AuthProvider>(dependencyKeys.global.AUTH)
  const logger = container.resolve<Logger>(dependencyKeys.global.LOGGER)

  const clerkWebhookApp = new Hono()

  clerkWebhookApp.post('/', async (c) => {
    // Prefer config-sourced secret; fall back to env var so test doubles that
    // don't register CONFIG still work via process.env.CLERK_WEBHOOK_SECRET.
    let secret: string | undefined
    try {
      const cfg = container.resolve(dependencyKeys.global.CONFIG) as
        | { auth?: { clerkWebhookSecret?: string } }
        | undefined
      secret = cfg?.auth?.clerkWebhookSecret
    } catch {
      // Container may not have CONFIG (e.g. in test environments).
    }
    if (!secret) {
      secret = process.env.CLERK_WEBHOOK_SECRET
    }

    if (!secret) {
      logger.error('[webhooks/clerk] CLERK_WEBHOOK_SECRET is not set')
      return c.json({ error: 'webhook secret not configured' }, 500)
    }

    const svixId = c.req.header('svix-id')
    const svixTimestamp = c.req.header('svix-timestamp')
    const svixSignature = c.req.header('svix-signature')
    if (!svixId || !svixTimestamp || !svixSignature) {
      return c.json({ error: 'missing svix headers' }, 400)
    }

    // MUST read the raw body before any JSON parser touches it.
    const rawBody = await c.req.text()

    let verified: unknown
    try {
      verified = verifyClerkWebhook(
        rawBody,
        { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': svixSignature },
        secret,
      )
    } catch (err) {
      logger.warn({ message: '[webhooks/clerk] signature verification failed', err: String(err) })
      return c.json({ error: 'invalid signature' }, 400)
    }

    const parsed = ClerkWebhookEventSchema.safeParse(verified)
    if (!parsed.success) {
      // Event shape we do not handle (session.*, email.*, ...). ACK with 200 so
      // svix does not retry — we deliberately ignore these.
      const rawType = (verified as { type?: unknown } | null)?.type
      logger.info({ message: '[webhooks/clerk] ignoring unhandled event', type: rawType })
      return c.json({ ok: true, ignored: true }, 200)
    }

    const event = parsed.data

    switch (event.type) {
      case 'user.created': {
        const email = pickPrimaryEmail(event.data)
        const displayName = composeDisplayName(event.data.first_name, event.data.last_name)
        const userId = event.data.id
        try {
          await userRepository.create({
            clerkUserId: userId,
            email: email ?? '',
            displayName,
            avatarUrl: event.data.image_url ?? null,
          })
          await auth.syncFromWebhook(event as unknown as WebhookEvent)
        } catch (err) {
          logger.error({
            message: '[webhooks/clerk] user.created failed',
            event: event.type,
            userId,
            err,
          })
          return c.json({ ok: false }, 500)
        }
        logger.info({ message: '[webhooks/clerk] user.created', userId, email, displayName })
        break
      }
      case 'user.updated': {
        const email = pickPrimaryEmail(event.data)
        const displayName = composeDisplayName(event.data.first_name, event.data.last_name)
        const userId = event.data.id
        try {
          const existing = await userRepository.findByClerkUserId(userId)
          if (existing) {
            await userRepository.update(existing.id, {
              email: email ?? undefined,
              displayName,
              avatarUrl: event.data.image_url ?? null,
            })
          }
          await auth.syncFromWebhook(event as unknown as WebhookEvent)
        } catch (err) {
          logger.error({
            message: '[webhooks/clerk] user.updated failed',
            event: event.type,
            userId,
            err,
          })
          return c.json({ ok: false }, 500)
        }
        logger.info({ message: '[webhooks/clerk] user.updated', userId, email, displayName })
        break
      }
      case 'user.deleted': {
        const userId = event.data.id
        try {
          const existing = await userRepository.findByClerkUserId(userId)
          if (existing) {
            await userRepository.delete(existing.id)
          }
          await auth.syncFromWebhook(event as unknown as WebhookEvent)
        } catch (err) {
          logger.error({
            message: '[webhooks/clerk] user.deleted failed',
            event: event.type,
            userId,
            err,
          })
          return c.json({ ok: false }, 500)
        }
        logger.info({ message: '[webhooks/clerk] user.deleted', userId })
        break
      }
    }

    return c.json({ ok: true }, 200)
  })

  return clerkWebhookApp
}

/**
 * Back-compat default export — a no-op stub app used only when the module
 * is imported without DI (legacy test paths pre-factory refactor).
 *
 * index.ts MUST be updated to:
 *   import { createClerkWebhookApp } from './routes/webhooks/clerk'
 *   app.route('/api/webhooks/clerk', createClerkWebhookApp(container))
 *
 * This stub will be removed once index.ts is updated.
 */
const _stubApp = new Hono()
export default _stubApp
