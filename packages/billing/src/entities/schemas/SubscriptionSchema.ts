import { z } from 'zod'
import { BillingSourceSchema } from '../types/BillingSource.ts'

/**
 * Canonical subscription row. Both Stripe subscriptions and RevenueCat
 * entitlements are projected into this shape before reaching the port.
 *
 * - `id`          — provider's subscription/entitlement id (for audit).
 * - `userId`      — platform user id (NOT the provider customer id).
 * - `source`      — lane that produced the row.
 * - `status`      — normalized lifecycle status (see docs).
 * - `productId`   — provider product/price identifier.
 * - `currentPeriodStart` / `currentPeriodEnd` — billing period boundaries.
 * - `cancelAt`    — scheduled cancellation time, if any.
 */
export const SubscriptionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  source: BillingSourceSchema,
  status: z.enum(['active', 'grace', 'expired', 'cancelled']),
  productId: z.string().min(1),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAt: z.date().nullable(),
})

/** Inferred type for {@link SubscriptionSchema}. */
export type Subscription = z.infer<typeof SubscriptionSchema>
