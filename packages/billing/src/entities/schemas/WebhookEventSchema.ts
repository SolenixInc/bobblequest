import type Stripe from 'stripe'
import { z } from 'zod'

/**
 * RevenueCat webhook event types the platform handles. Reference:
 * https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */
export const RevenueCatEventTypeSchema = z.enum([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'UNCANCELLATION',
])

/** Inferred type for {@link RevenueCatEventTypeSchema}. */
export type RevenueCatEventType = z.infer<typeof RevenueCatEventTypeSchema>

/**
 * Inner `event` payload of a RevenueCat webhook. Only the fields the platform
 * actually consumes are modelled — RC's full payload is wider.
 */
export const RevenueCatEventPayloadSchema = z.object({
  id: z.string().min(1),
  type: RevenueCatEventTypeSchema,
  app_user_id: z.string().min(1),
  product_id: z.string().min(1),
  // Epoch millis. Nullable because not every event type carries it (e.g.
  // `NON_RENEWING_PURCHASE`, `CANCELLATION` variants).
  expiration_at_ms: z.number().int().nullable().optional(),
  event_timestamp_ms: z.number().int(),
})

/**
 * Top-level RevenueCat webhook body shape.
 */
export const RevenueCatWebhookEventSchema = z.object({
  event: RevenueCatEventPayloadSchema,
  api_version: z.string().optional(),
})

/** Inferred type for {@link RevenueCatWebhookEventSchema}. */
export type RevenueCatWebhookEvent = z.infer<typeof RevenueCatWebhookEventSchema>

/**
 * Re-export the Stripe event type so consumers can import everything webhook-
 * shaped from one module without pulling `stripe` directly.
 */
export type StripeEvent = Stripe.Event
