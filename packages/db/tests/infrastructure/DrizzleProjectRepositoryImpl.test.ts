import { describe, expect, it, vi } from 'vitest'
import { ProjectRepository } from '../../src/entities/ports/ProjectRepository.ts'
import type { DrizzleDbClientImpl } from '../../src/infrastructure/drizzle/DrizzleDbClientImpl.ts'
import { DrizzleProjectRepositoryImpl } from '../../src/infrastructure/drizzle/DrizzleProjectRepositoryImpl.ts'

// ---------------------------------------------------------------------------
// Fake query builder chain
// ---------------------------------------------------------------------------

function makeProjectRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'p-1',
    name: 'Project One',
    description: null,
    ownerId: 'user_1',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function makeDrizzleMock(returnRows: unknown[]) {
  const chain = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  // select chain: .select().from().where().limit().offset()
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      const limitResult = {
        offset: vi.fn().mockResolvedValue(returnRows),
      }
      // Make limitResult thenable so .limit(1) resolves to rows when not
      // chained with .offset (used by findById).
      Object.defineProperty(limitResult, 'then', {
        value: (resolve: (v: unknown[]) => unknown) => resolve(returnRows),
      })
      return limitResult
    }),
  }
  chain.select.mockReturnValue(selectChain)

  // insert chain: .insert().values().returning()
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnRows),
  }
  chain.insert.mockReturnValue(insertChain)

  // update chain: .update().set().where().returning()
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnRows),
  }
  chain.update.mockReturnValue(updateChain)

  // delete chain: .delete().where()
  const deleteChain = {
    where: vi.fn().mockResolvedValue(undefined),
  }
  chain.delete.mockReturnValue(deleteChain)

  return chain
}

function makeClient(rows: unknown[]) {
  const drizzleMock = makeDrizzleMock(rows)
  const client = {
    getDrizzle: vi.fn().mockReturnValue(drizzleMock),
  } as unknown as DrizzleDbClientImpl
  return { client, drizzleMock }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DrizzleProjectRepositoryImpl', () => {
  it('is an instance of ProjectRepository port', () => {
    const { client } = makeClient([])
    expect(new DrizzleProjectRepositoryImpl(client)).toBeInstanceOf(ProjectRepository)
  })

  it('findById returns null when no row found', async () => {
    const { client } = makeClient([])
    const repo = new DrizzleProjectRepositoryImpl(client)
    expect(await repo.findById('missing')).toBeNull()
  })

  it('findById returns mapped project when row found', async () => {
    const row = makeProjectRow()
    const { client } = makeClient([row])
    const repo = new DrizzleProjectRepositoryImpl(client)
    const project = await repo.findById('p-1')
    expect(project?.id).toBe('p-1')
    expect(project?.name).toBe('Project One')
    expect(project?.ownerId).toBe('user_1')
    expect(project?.status).toBe('active')
    expect(project?.createdAt).toBeInstanceOf(Date)
  })

  it('findByName returns null when no row found', async () => {
    const { client } = makeClient([])
    const repo = new DrizzleProjectRepositoryImpl(client)
    expect(await repo.findByName('NonExistent')).toBeNull()
  })

  it('findByName returns mapped project when row found', async () => {
    const row = makeProjectRow({ name: 'My Project' })
    const { client } = makeClient([row])
    const repo = new DrizzleProjectRepositoryImpl(client)
    const project = await repo.findByName('My Project')
    expect(project?.id).toBe('p-1')
    expect(project?.name).toBe('My Project')
  })

  it('findByOwnerId returns empty array when no rows found', async () => {
    const { client } = makeClient([])
    const repo = new DrizzleProjectRepositoryImpl(client)
    expect(await repo.findByOwnerId('no-such', { limit: 10, offset: 0 })).toEqual([])
  })

  it('findByOwnerId returns mapped projects when found', async () => {
    const row = makeProjectRow()
    const { client } = makeClient([row])
    const repo = new DrizzleProjectRepositoryImpl(client)
    const projects = await repo.findByOwnerId('user_1', { limit: 10, offset: 0 })
    expect(projects).toHaveLength(1)
    expect(projects[0].ownerId).toBe('user_1')
  })

  it('list returns paginated projects', async () => {
    const row = makeProjectRow()
    const { client } = makeClient([row])
    const repo = new DrizzleProjectRepositoryImpl(client)
    const projects = await repo.list({ limit: 5, offset: 0 })
    expect(projects).toHaveLength(1)
  })

  it('create returns mapped project from insert returning', async () => {
    const row = makeProjectRow()
    const { client } = makeClient([row])
    const repo = new DrizzleProjectRepositoryImpl(client)
    const project = await repo.create({
      name: 'Project One',
      ownerId: 'user_1',
    })
    expect(project.id).toBe('p-1')
  })

  it('create throws when insert returns no row', async () => {
    const { client } = makeClient([])
    const repo = new DrizzleProjectRepositoryImpl(client)
    await expect(repo.create({ name: 'N', ownerId: 'o' })).rejects.toThrow(/insert returned no row/)
  })

  it('update returns mapped project from update returning', async () => {
    const row = makeProjectRow({ name: 'Renamed' })
    const { client } = makeClient([row])
    const repo = new DrizzleProjectRepositoryImpl(client)
    const project = await repo.update('p-1', { name: 'Renamed' })
    expect(project.name).toBe('Renamed')
  })

  it('update throws when no row returned (project not found)', async () => {
    const { client } = makeClient([])
    const repo = new DrizzleProjectRepositoryImpl(client)
    await expect(repo.update('no-id', { name: 'X' })).rejects.toThrow(/no project with id/)
  })

  it('update with description and status includes them in SET clause', async () => {
    const row = makeProjectRow({ description: 'D', status: 'archived' })
    const { client } = makeClient([row])
    const repo = new DrizzleProjectRepositoryImpl(client)
    const project = await repo.update('p-1', {
      description: 'D',
      status: 'archived',
    })
    expect(project.description).toBe('D')
    expect(project.status).toBe('archived')
  })

  it('delete calls delete().where() without throwing', async () => {
    const { client, drizzleMock } = makeClient([])
    const repo = new DrizzleProjectRepositoryImpl(client)
    await expect(repo.delete('p-1')).resolves.toBeUndefined()
    expect(drizzleMock.delete).toHaveBeenCalled()
  })
})
