import { z } from 'zod'

/**
 * Canonical auth subject shape. The identity plane (Clerk) owns credentials +
 * session lifecycle; this schema represents the minimal, provider-agnostic
 * projection consumed by the rest of the platform.
 *
 * `id` is the Clerk user id (e.g. `user_abc...`) at the port boundary —
 * Postgres owns its own primary keys and maps via `users.clerk_user_id`.
 */
export const AuthUserSchema = z.object({
  id: z.string().min(1).describe('Clerk user id (sub claim)'),
  email: z
    .string()
    .email()
    .nullable()
    .describe('Primary email address; may be null for anonymous / machine users'),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  role: z
    .string()
    .nullable()
    .optional()
    .describe('Optional role claim — typically sourced from Clerk public metadata'),
})

export type AuthUser = z.infer<typeof AuthUserSchema>
