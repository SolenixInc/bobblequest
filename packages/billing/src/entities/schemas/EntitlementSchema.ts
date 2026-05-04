import { z } from 'zod'
import { BillingSourceSchema } from '../types/BillingSource.ts'

/**
 * Read-model entitlement — what `getEntitlements(userId)` returns.
 *
 * `status` is normalized across providers:
 *  - `"active"`     — subscription is current and paid.
 *  - `"grace"`      — Stripe `past_due` OR RevenueCat `BILLING_ISSUE`.
 *  - `"expired"`    — term ended, no renewal (RC `EXPIRATION`).
 *  - `"cancelled"`  — explicit cancel, refund, or chargeback. Immediate
 *    revocation (see `docs/architecture/platform/billing.md` — Revocation
 *    timing).
 */
export const EntitlementSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  source: BillingSourceSchema,
  status: z.enum(['active', 'grace', 'expired', 'cancelled']),
  expiresAt: z.date().nullable(),
})

/** Inferred type for {@link EntitlementSchema}. */
export type Entitlement = z.infer<typeof EntitlementSchema>
