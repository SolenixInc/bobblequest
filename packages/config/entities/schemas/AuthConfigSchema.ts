import { z } from 'zod'

/**
 * Schema for the `auth` configuration namespace.
 *
 * Consumed by `@t/auth`'s Clerk implementation at composition-root wiring
 * time. `@t/auth` itself never reads env vars — this schema defines the
 * env surface.
 *
 * **Environment Variables:**
 * - `CLERK_PUBLISHABLE_KEY` — client-side publishable key (safe to expose in
 *   bundles). Used by `apps/web`, `apps/mobile`, `apps/desktop` to init the
 *   Clerk SDKs. Server code does not use it for verification.
 * - `CLERK_SECRET_KEY` — server-only secret key used by `@clerk/backend` in
 *   `apps/api` for JWKS init + Clerk Backend API calls. **Never** ship to
 *   clients.
 * - `CLERK_WEBHOOK_SECRET` — svix signing secret used by `apps/api` to
 *   verify `/webhooks/clerk` payloads.
 */
export const AuthConfigSchema = z.object({
  clerkPublishableKey: z
    .string()
    .optional()
    .describe('CLERK_PUBLISHABLE_KEY — client publishable key'),
  clerkSecretKey: z.string().optional().describe('CLERK_SECRET_KEY — server-only secret key'),
  clerkWebhookSecret: z
    .string()
    .optional()
    .describe('CLERK_WEBHOOK_SECRET — svix signing secret for /webhooks/clerk'),
})

/**
 * Type inferred from AuthConfigSchema.
 */
export type AuthConfig = z.infer<typeof AuthConfigSchema>

/**
 * Resolves auth configuration from a process environment record.
 *
 * Maps the `CLERK_*` env vars into the shape expected by
 * {@link AuthConfigSchema}.
 */
export function resolveAuthConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): AuthConfig {
  return AuthConfigSchema.parse({
    clerkPublishableKey:
      env.CLERK_PUBLISHABLE_KEY ??
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
      env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    clerkSecretKey: env.CLERK_SECRET_KEY,
    clerkWebhookSecret: env.CLERK_WEBHOOK_SECRET,
  })
}
