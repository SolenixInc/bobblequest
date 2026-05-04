/**
 * Domain-level `User` — plain TS shape consumed by callers who should
 * not import Drizzle directly. Mirrors `UserRow` from the schema but
 * is decoupled from the driver so the port stays driver-agnostic.
 */
export interface User {
  readonly id: string
  readonly clerkUserId: string
  readonly email: string
  readonly displayName: string | null
  readonly avatarUrl: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

/** Caller-supplied fields on create. `id` / timestamps are server-set. */
export interface CreateUserInput {
  readonly clerkUserId: string
  readonly email: string
  readonly displayName?: string | null
  readonly avatarUrl?: string | null
}

/**
 * Partial update. Only non-identity fields are mutable here; to change
 * `clerkUserId` delete and recreate (identity moves are rare and usually
 * indicate a webhook bug).
 */
export interface UpdateUserInput {
  readonly email?: string
  readonly displayName?: string | null
  readonly avatarUrl?: string | null
}
