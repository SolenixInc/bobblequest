import { z } from 'zod'

/**
 * Identity join between the platform's `user_id` and the two provider-specific
 * customer ids. Persisted in a `billing_identities` table (or a column on
 * `users` — decision deferred).
 */
export const CustomerSchema = z.object({
  userId: z.string().min(1),
  stripeCustomerId: z.string().min(1).nullable(),
  revenuecatAppUserId: z.string().min(1).nullable(),
  email: z.string().email().nullable(),
})

/** Inferred type for {@link CustomerSchema}. */
export type Customer = z.infer<typeof CustomerSchema>
