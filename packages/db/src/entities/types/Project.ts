/**
 * Domain-level `Project` - plain TS shape consumed by callers who should
 * not import Drizzle directly. Mirrors `ProjectRow` from the schema but
 * is decoupled from the driver so the port stays driver-agnostic.
 */
export interface Project {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly ownerId: string
  readonly status: 'active' | 'archived' | 'deleted'
  readonly createdAt: Date
  readonly updatedAt: Date
}

/** Caller-supplied fields on create. `id` / timestamps are server-set. */
export interface CreateProjectInput {
  readonly name: string
  readonly description?: string | null
  readonly ownerId: string
  readonly status?: 'active' | 'archived' | 'deleted'
}

/** Partial update. Only mutable fields are listed here. */
export interface UpdateProjectInput {
  readonly name?: string
  readonly description?: string | null
  readonly status?: 'active' | 'archived' | 'deleted'
}
