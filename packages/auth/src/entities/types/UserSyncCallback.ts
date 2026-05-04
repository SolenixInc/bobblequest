import type { WebhookEvent } from '../schemas/WebhookEventSchema.ts'

/**
 * Callback invoked by {@link AuthProvider.syncFromWebhook} to mirror Clerk
 * user-lifecycle events into the application database.
 *
 * Supplied by the composition root (typically backed by `@t/database`) so
 * `@t/auth` stays DB-agnostic — no Drizzle / postgres.js types leak here.
 *
 * Must be idempotent: Clerk retries non-2xx webhook deliveries, so replays
 * of the same `event.data.id` are expected and should upsert cleanly.
 */
export type UserSyncCallback = (event: WebhookEvent) => Promise<void>
