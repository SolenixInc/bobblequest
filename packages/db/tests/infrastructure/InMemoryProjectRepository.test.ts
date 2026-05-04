import { beforeEach, describe, expect, it } from 'vitest'
import { ProjectRepository } from '../../src/entities/ports/ProjectRepository.ts'
import { InMemoryProjectRepository } from '../../src/infrastructure/in-memory/InMemoryProjectRepository.ts'

describe('InMemoryProjectRepository', () => {
  let repo: InMemoryProjectRepository
  beforeEach(() => {
    repo = new InMemoryProjectRepository()
  })

  it('is an instance of the ProjectRepository port', () => {
    expect(repo).toBeInstanceOf(ProjectRepository)
  })

  it('returns null for absent lookups', async () => {
    expect(await repo.findById('missing')).toBeNull()
    expect(await repo.findByName('Missing')).toBeNull()
    expect(await repo.findByOwnerId('user_missing', { limit: 10, offset: 0 })).toEqual([])
  })

  it('creates a project and stamps server fields', async () => {
    const project = await repo.create({
      name: 'Alpha',
      ownerId: 'user_abc',
    })
    expect(project.id).toBeTypeOf('string')
    expect(project.id.length).toBeGreaterThan(0)
    expect(project.name).toBe('Alpha')
    expect(project.description).toBeNull()
    expect(project.ownerId).toBe('user_abc')
    expect(project.status).toBe('active')
    expect(project.createdAt).toBeInstanceOf(Date)
    expect(project.updatedAt).toBeInstanceOf(Date)
  })

  it('finds by id and name', async () => {
    const created = await repo.create({
      name: 'Beta',
      ownerId: 'user_find',
      description: 'A beta project',
    })
    expect(await repo.findById(created.id)).toEqual(created)
    expect(await repo.findByName('Beta')).toEqual(created)
    expect(await repo.findByName('beta')).toBeNull() // case-sensitive
  })

  it('finds by ownerId with pagination', async () => {
    const p1 = await repo.create({ name: 'P1', ownerId: 'user_x' })
    const p2 = await repo.create({ name: 'P2', ownerId: 'user_x' })
    const p3 = await repo.create({ name: 'P3', ownerId: 'user_x' })
    const pOther = await repo.create({ name: 'Other', ownerId: 'user_y' })

    const page = await repo.findByOwnerId('user_x', { limit: 2, offset: 0 })
    expect(page.length).toBe(2)
    expect(page[0]).toEqual(p1)
    expect(page[1]).toEqual(p2)

    const page2 = await repo.findByOwnerId('user_x', { limit: 2, offset: 2 })
    expect(page2.length).toBe(1)
    expect(page2[0]).toEqual(p3)

    expect(await repo.findByOwnerId('user_y', { limit: 10, offset: 0 })).toEqual([pOther])
  })

  it('updates mutable fields and bumps updatedAt', async () => {
    const created = await repo.create({ name: 'Orig', ownerId: 'user_upd' })
    await new Promise((r) => setTimeout(r, 2))
    const updated = await repo.update(created.id, {
      name: 'Renamed',
      description: 'New desc',
      status: 'archived',
    })
    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('Renamed')
    expect(updated.description).toBe('New desc')
    expect(updated.status).toBe('archived')
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
  })

  it('update throws when the row does not exist', async () => {
    await expect(repo.update('no-such-id', { name: 'X' })).rejects.toThrow(/no project/i)
  })

  it('delete is idempotent', async () => {
    const p = await repo.create({ name: 'ToDelete', ownerId: 'user_del' })
    await repo.delete(p.id)
    await repo.delete(p.id) // idempotent
    expect(await repo.findById(p.id)).toBeNull()
  })

  it('update preserves existing description when not supplied', async () => {
    const created = await repo.create({
      name: 'Preserve',
      ownerId: 'user_preserve',
      description: 'Original desc',
    })
    const updated = await repo.update(created.id, { name: 'Renamed' })
    expect(updated.description).toBe('Original desc')
    expect(updated.status).toBe('active')
  })

  it('update sets description when provided', async () => {
    const created = await repo.create({ name: 'SetFields', ownerId: 'user_sf' })
    const updated = await repo.update(created.id, {
      name: 'Renamed',
      description: 'New desc',
    })
    expect(updated.name).toBe('Renamed')
    expect(updated.description).toBe('New desc')
  })

  it('clear() removes all projects', async () => {
    await repo.create({ name: 'ClearMe', ownerId: 'user_clear' })
    repo.clear()
    expect(await repo.findByName('ClearMe')).toBeNull()
  })

  it('update preserves name when not supplied in update input', async () => {
    const created = await repo.create({ name: 'Preserve Name', ownerId: 'user_pn' })
    // Pass update without name — exercises the false branch of `input.name ?? existing.name`
    const updated = await repo.update(created.id, { status: 'archived' })
    expect(updated.name).toBe('Preserve Name')
    expect(updated.status).toBe('archived')
  })

  it('list returns paginated projects sorted by createdAt', async () => {
    await repo.create({ name: 'L1', ownerId: 'user_list' })
    await repo.create({ name: 'L2', ownerId: 'user_list' })
    await repo.create({ name: 'L3', ownerId: 'user_list' })
    const page1 = await repo.list({ limit: 2, offset: 0 })
    expect(page1).toHaveLength(2)
    expect(page1[0].name).toBe('L1')
    const page2 = await repo.list({ limit: 2, offset: 2 })
    expect(page2).toHaveLength(1)
    expect(page2[0].name).toBe('L3')
  })

  it('create exercises crypto fallback when randomUUID is unavailable', async () => {
    const saved = globalThis.crypto
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true,
        writable: true,
      })
      const project = await repo.create({ name: 'Fallback', ownerId: 'user_fb' })
      expect(project.id).toMatch(/^inmem-/)
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: saved,
        configurable: true,
        writable: true,
      })
    }
  })
})
