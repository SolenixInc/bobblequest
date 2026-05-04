import { z } from 'zod'

/**
 * Session JWT claims as emitted by Clerk and surfaced by the platform
 * after `@clerk/backend` `verifyToken` validation succeeds.
 *
 * Only the stable claim set the platform depends on is typed here. Provider-
 * specific extras (e.g. `org_id`, custom session claims) stay in
 * `publicMetadata` / `privateMetadata` and are opaque at this boundary.
 */
export const SessionClaimsSchema = z.object({
  /** Clerk user id — identifies the authenticated subject. */
  sub: z.string().min(1),
  /** Clerk session id — lets the server correlate a token to its session. */
  sid: z.string().min(1),
  /** Authorized party — the client origin the session was minted for. */
  azp: z.string().optional(),
  /** Issued-at (Unix seconds). */
  iat: z.number().int().nonnegative(),
  /** Not-before (Unix seconds). */
  nbf: z.number().int().nonnegative().optional(),
  /** Expiry (Unix seconds). */
  exp: z.number().int().nonnegative(),
  /** Issuer URL (https://<clerk-instance>). */
  iss: z.string().min(1),
})

export type SessionClaims = z.infer<typeof SessionClaimsSchema>
