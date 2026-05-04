import { z } from 'zod'

/**
 * Provider tag attached to every {@link Entitlement} and {@link Subscription}
 * so the platform can tell which payment lane originated the row.
 *
 * - `"stripe"` — web + desktop hosted Checkout.
 * - `"revenuecat"` — mobile in-app purchases (StoreKit / Play Billing).
 */
export const BillingSourceSchema = z.enum(['stripe', 'revenuecat'])

/** Inferred type for {@link BillingSourceSchema}. */
export type BillingSource = z.infer<typeof BillingSourceSchema>
