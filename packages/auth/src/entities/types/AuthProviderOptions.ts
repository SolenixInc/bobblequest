import type { UserSyncCallback } from './UserSyncCallback.ts'

/**
 * Options bag common to every {@link AuthProvider} implementation.
 *
 * `clerkSecretKey` is Clerk-specific but lives here (rather than impl-local)
 * so the DI registrar can forward the same shape to every provider — stubs
 * simply ignore it.
 */
export interface AuthProviderOptions {
  /** Clerk server-side secret key (`CLERK_SECRET_KEY`). */
  clerkSecretKey?: string
  /** Clerk publishable key (`CLERK_PUBLISHABLE_KEY`). */
  clerkPublishableKey?: string
  /** svix signing secret used to verify Clerk webhook payloads. */
  clerkWebhookSecret?: string
  /**
   * List of allowed `azp` claim values (client origins) for token
   * verification. Forwarded to `@clerk/backend` `verifyToken`.
   */
  authorizedParties?: readonly string[]
  /**
   * Optional mirror callback invoked by `syncFromWebhook` after a
   * successful signature + schema check. Supplied by the composition root.
   */
  userSync?: UserSyncCallback
}
