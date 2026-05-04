import type { Project } from '../types/Project.ts'
import type { CreateProjectInput, UpdateProjectInput } from '../types/Project.ts'

/**
 * Abstract repository port for the `projects` table.
 *
 * Projects are scoped to an owner (a Clerk user id) and carry a lifecycle
 * status (`active`, `archived`, `deleted`). All CRUD operations are
 * owner-aware so routers can enforce row-level security at the port level.
 *
 * Implementations:
 *   - `DrizzleProjectRepositoryImpl` - postgres-js + Drizzle over the
 *     Railway Postgres pool bound by `registerDbDI`.
 *   - `InMemoryProjectRepository` - Map-backed test double.
 *
 * Consumers (routers, workers) depend ONLY on this abstract class.
 */
export abstract class ProjectRepository {
  /** Find a project by its internal id (UUID primary key). */
  abstract findById(id: string): Promise<Project | null>

  /** Find a project by exact name (case-sensitive). */
  abstract findByName(name: string): Promise<Project | null>

  /** List projects belonging to a specific owner, with optional pagination. */
  abstract findByOwnerId(
    ownerId: string,
    pagination: { limit: number; offset: number },
  ): Promise<Project[]>

  /** Create a new project row. Throws on unique-constraint violations. */
  abstract create(input: CreateProjectInput): Promise<Project>

  /**
   * Partial update by internal id. Returns the updated row. Throws if
   * the row does not exist so callers don't silently no-op.
   */
  abstract update(id: string, input: UpdateProjectInput): Promise<Project>

  /**
   * Delete by internal id. Idempotent - deleting an absent row is not
   * an error.
   */
  abstract delete(id: string): Promise<void>

  /** List all projects with pagination. */
  abstract list(pagination: { limit: number; offset: number }): Promise<Project[]>
}
