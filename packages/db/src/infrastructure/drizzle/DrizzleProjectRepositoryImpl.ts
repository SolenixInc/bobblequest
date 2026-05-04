import { eq } from 'drizzle-orm'
import { ProjectRepository } from '../../entities/ports/ProjectRepository.ts'
import { type ProjectRow, projects } from '../../entities/schemas/projects.ts'
import type {
  CreateProjectInput,
  UpdateProjectInput,
  Project,
} from '../../entities/types/Project.ts'
import type { DrizzleDbClientImpl } from './DrizzleDbClientImpl.ts'

/**
 * Drizzle-backed `ProjectRepository` impl. Depends on
 * {@link DrizzleDbClientImpl} - the same port + pool - rather than
 * re-implementing connection handling.
 *
 * All reads/writes flow through Drizzle's query builder; raw SQL is
 * intentionally avoided here so the port is driver-portable.
 */
export class DrizzleProjectRepositoryImpl extends ProjectRepository {
  constructor(private readonly client: DrizzleDbClientImpl) {
    super()
  }

  async findById(id: string): Promise<Project | null> {
    const row = await this.client
      .getDrizzle()
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)
    return row[0] ? toDomain(row[0]) : null
  }

  async findByName(name: string): Promise<Project | null> {
    const row = await this.client
      .getDrizzle()
      .select()
      .from(projects)
      .where(eq(projects.name, name))
      .limit(1)
    return row[0] ? toDomain(row[0]) : null
  }

  async findByOwnerId(
    ownerId: string,
    pagination: { limit: number; offset: number },
  ): Promise<Project[]> {
    const rows = await this.client
      .getDrizzle()
      .select()
      .from(projects)
      .where(eq(projects.ownerId, ownerId))
      .limit(pagination.limit)
      .offset(pagination.offset)
    return rows.map(toDomain)
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const [row] = await this.client
      .getDrizzle()
      .insert(projects)
      .values({
        name: input.name,
        description: input.description ?? null,
        ownerId: input.ownerId,
        status: input.status ?? 'active',
      })
      .returning()
    if (!row) throw new Error('DrizzleProjectRepositoryImpl: insert returned no row')
    return toDomain(row)
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const [row] = await this.client
      .getDrizzle()
      .update(projects)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning()
    if (!row) {
      throw new Error(`DrizzleProjectRepositoryImpl: no project with id '${id}'`)
    }
    return toDomain(row)
  }

  async delete(id: string): Promise<void> {
    await this.client.getDrizzle().delete(projects).where(eq(projects.id, id))
  }

  async list(pagination: { limit: number; offset: number }): Promise<Project[]> {
    const rows = await this.client
      .getDrizzle()
      .select()
      .from(projects)
      .limit(pagination.limit)
      .offset(pagination.offset)
    return rows.map(toDomain)
  }
}

function toDomain(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.ownerId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
