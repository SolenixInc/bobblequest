import type { AuthUser } from '../schemas/AuthUserSchema.ts'
import type { WebhookEvent } from '../schemas/WebhookEventSchema.ts'

/**
 * Canonical auth port. Implementations adapt this surface to a concrete
 * identity provider (Clerk, a deterministic noop/test double, ...).
 * Consumers — apps and other packages — depend ONLY on this port, never
 * on a concrete impl.
 *
 * The port is intentionally **narrow**: credential + session lifecycle
 * (sign-up, sign-in, refresh, logout, password reset) is owned by Clerk
 * via its client SDKs (`@clerk/nextjs`, `@clerk/clerk-expo`,
 * `@clerk/clerk-js`). `apps/api` consumes Clerk-issued tokens only.
 *
 * Signature set is frozen by `docs/architecture/platform/auth.md`
 * (`verify`, `currentUser`, `syncFromWebhook`).
 */
export abstract class AuthProvider {
  /**
   * Validate a Clerk-issued session JWT.
   *
   * - Verifies the signature against Clerk's JWKS (cached in-process by
   *   `@clerk/backend`).
   * - Enforces `exp`, `nbf`, and (when configured) `azp` / authorized
   *   parties.
   * - Throws {@link AuthError} on expired / tampered / missing / unauthorized
   *   tokens — NEVER returns `null` for invalid input.
   *
   * Returns the {@link AuthUser} projection extracted from the verified
   * claims (+ optional provider fetch for display fields).
   */
  abstract verify(token: string): Promise<AuthUser>

  /**
   * Convenience wrapper for tRPC context wiring.
   *
   * Swallows {@link AuthError} and returns `null` so `ctx.user` can be
   * `null` for unauthenticated requests without the caller writing
   * try/catch in every middleware. Unexpected errors still bubble.
   */
  abstract currentUser(token: string | null | undefined): Promise<AuthUser | null>

  /**
   * Apply a verified Clerk webhook event to the application datastore via
   * the `userSync` callback supplied at DI-registration time.
   *
   * The caller (webhook route) is responsible for svix signature
   * verification and for shaping the raw body into a {@link WebhookEvent}
   * (e.g. by parsing through `WebhookEventSchema`) before invoking this
   * method. Implementations treat `event` as trusted at this boundary.
   */
  abstract syncFromWebhook(event: WebhookEvent): Promise<void>
}
