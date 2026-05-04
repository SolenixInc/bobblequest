import { ProjectRepository } from '../../entities/ports/ProjectRepository.ts'
import type {
  CreateProjectInput,
  UpdateProjectInput,
  Project,
} from '../../entities/types/Project.ts'

/**
 * In-memory `ProjectRepository` used for unit tests and local dev without
 * a live Postgres. Storage is a single `Map<id, Project>`; secondary
 * lookups are rebuilt on every query so the behaviour mirrors the
 * Drizzle impl (no caching surprises).
 *
 * Not thread-safe across workers - single-process Map.
 */
export class InMemoryProjectRepository extends ProjectRepository {
  private readonly store = new Map<string, Project>()

  async findById(id: string): Promise<Project | null> {
    return this.store.get(id) ?? null
  }

  async findByName(name: string): Promise<Project | null> {
    for (const project of this.store.values()) {
      if (project.name === name) return project
    }
    return null
  }

  async findByOwnerId(
    ownerId: string,
    pagination: { limit: number; offset: number },
  ): Promise<Project[]> {
    const all = Array.from(this.store.values())
      .filter((p) => p.ownerId === ownerId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    return all.slice(pagination.offset, pagination.offset + pagination.limit)
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date()
    const project: Project = {
      id: cryptoRandomUuid(),
      name: input.name,
      description: input.description ?? null,
      ownerId: input.ownerId,
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    }
    this.store.set(project.id, project)
    return project
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const existing = this.store.get(id)
    if (!existing) {
      throw new Error(`InMemoryProjectRepository: no project with id '${id}'`)
    }
    const next: Project = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description !== undefined ? input.description : existing.description,
      status: input.status ?? existing.status,
      updatedAt: new Date(),
    }
    this.store.set(id, next)
    return next
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  async list(pagination: { limit: number; offset: number }): Promise<Project[]> {
    const all = Array.from(this.store.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )
    return all.slice(pagination.offset, pagination.offset + pagination.limit)
  }

  /** Test helper: empty the store between cases. */
  clear(): void {
    this.store.clear()
  }
}

function cryptoRandomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `inmem-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
