import { z } from 'zod'

/**
 * Narrow Zod view over Clerk user-lifecycle webhook events.
 *
 * Clerk emits many event types; the platform consumes the three user-lifecycle
 * variants required to keep the Postgres `users` mirror consistent.
 *
 * Signature verification (svix) is performed BEFORE calling into the port —
 * this schema shapes the already-verified event body.
 */
const EmailAddressSchema = z.object({
  id: z.string(),
  email_address: z.string().email(),
})

const UserEventDataSchema = z.object({
  id: z.string().min(1),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  primary_email_address_id: z.string().nullable().optional(),
  email_addresses: z.array(EmailAddressSchema).default([]),
  public_metadata: z.record(z.unknown()).optional(),
  created_at: z.number().int().optional(),
  updated_at: z.number().int().optional(),
})

const UserDeletedDataSchema = z.object({
  id: z.string().min(1),
  deleted: z.literal(true).optional(),
})

export const UserCreatedEventSchema = z.object({
  type: z.literal('user.created'),
  data: UserEventDataSchema,
})

export const UserUpdatedEventSchema = z.object({
  type: z.literal('user.updated'),
  data: UserEventDataSchema,
})

export const UserDeletedEventSchema = z.object({
  type: z.literal('user.deleted'),
  data: UserDeletedDataSchema,
})

/**
 * Discriminated union of the three lifecycle events the webhook sync honors.
 * Other Clerk events (session.*, email.*, ...) are accepted at the route
 * level but rejected (no-op) at the port level.
 */
export const WebhookEventSchema = z.discriminatedUnion('type', [
  UserCreatedEventSchema,
  UserUpdatedEventSchema,
  UserDeletedEventSchema,
])

export type UserCreatedEvent = z.infer<typeof UserCreatedEventSchema>
export type UserUpdatedEvent = z.infer<typeof UserUpdatedEventSchema>
export type UserDeletedEvent = z.infer<typeof UserDeletedEventSchema>
export type WebhookEvent = z.infer<typeof WebhookEventSchema>
