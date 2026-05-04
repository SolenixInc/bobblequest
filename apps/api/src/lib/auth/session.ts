/**
 * Shared session primitives used by both the Hono middleware layer
 * (`clerkAuth`) and the tRPC context factory (`createContext`).
 *
 * Keep this file small: only types and pure helpers that have no
 * infrastructure dependencies belong here.
 */

/**
 * Minimal session-derived user projection. Shaped from the Clerk JWT claims
 * (never a provider fetch). Richer user data (display name, avatar) lives in
 * the app-side `users` table and is retrieved by routers via `UserRepository`.
 */
export interface SessionUser {
  /** Clerk user id (sub claim; e.g. `user_abc...`). */
  id: string
  /** Optional role claim, typically sourced from Clerk `publicMetadata.role`. */
  role: string | null
  /** Optional primary email claim. */
  email: string | null
}

/**
 * Pulls a `Bearer <token>` out of the Authorization header.
 * Returns null if the header is absent, lacks the `Bearer ` prefix, or
 * contains only whitespace after the prefix.
 */
export function readBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  /* v8 ignore next — both branches exercised; v8 miscounts this conditional */
  if (token.length === 0) return null
  return token
}
