import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { UserRepository } from '../../src/entities/ports/UserRepository.ts'
import { DrizzleDbClientImpl } from '../../src/infrastructure/drizzle/DrizzleDbClientImpl.ts'
import { DrizzleUserRepositoryImpl } from '../../src/infrastructure/drizzle/DrizzleUserRepositoryImpl.ts'
import {
  closeTestClient,
  getTestClient,
  isDbAvailable,
  runMigrations,
  truncateTables,
} from './setup.ts'

const available = await isDbAvailable()

describe.skipIf(!available)('DrizzleUserRepositoryImpl (live Postgres)', () => {
  let repo: DrizzleUserRepositoryImpl

  beforeAll(async () => {
    const sql = await getTestClient()
    await runMigrations(sql)
    const client = new DrizzleDbClientImpl({ client: sql })
    repo = new DrizzleUserRepositoryImpl(client)
  })

  beforeEach(async () => {
    const sql = await getTestClient()
    await truncateTables(sql)
  })

  afterAll(async () => {
    await closeTestClient()
  })

  it('is an instance of UserRepository', () => {
    expect(repo).toBeInstanceOf(UserRepository)
  })

  it('creates and finds a user by id', async () => {
    const created = await repo.create({
      clerkUserId: 'user_live_1',
      email: 'live1@example.com',
      displayName: 'Live One',
    })
    expect(created.clerkUserId).toBe('user_live_1')
    expect(created.email).toBe('live1@example.com')

    const found = await repo.findById(created.id)
    expect(found).not.toBeNull()
    expect(found?.email).toBe('live1@example.com')
  })

  it('finds by clerkUserId', async () => {
    await repo.create({ clerkUserId: 'user_ck', email: 'ck@example.com' })
    const found = await repo.findByClerkUserId('user_ck')
    expect(found?.email).toBe('ck@example.com')
  })

  it('finds by email', async () => {
    await repo.create({ clerkUserId: 'user_em', email: 'em@example.com' })
    const found = await repo.findByEmail('em@example.com')
    expect(found?.clerkUserId).toBe('user_em')
  })

  it('updates mutable fields', async () => {
    const created = await repo.create({
      clerkUserId: 'user_upd',
      email: 'upd@example.com',
      displayName: 'Orig',
    })
    const updated = await repo.update(created.id, {
      displayName: 'Updated',
      email: 'new@example.com',
    })
    expect(updated.displayName).toBe('Updated')
    expect(updated.email).toBe('new@example.com')
  })

  it('throws on update for missing id', async () => {
    await expect(
      repo.update('00000000-0000-0000-0000-000000000000', { email: 'x@y.z' }),
    ).rejects.toThrow(/no user with id/)
  })

  it('deletes a user', async () => {
    const created = await repo.create({ clerkUserId: 'user_del', email: 'del@example.com' })
    await repo.delete(created.id)
    expect(await repo.findById(created.id)).toBeNull()
  })

  it('enforces unique clerk_user_id', async () => {
    await repo.create({ clerkUserId: 'user_dup', email: 'a@example.com' })
    try {
      await repo.create({ clerkUserId: 'user_dup', email: 'b@example.com' })
      expect.fail('expected duplicate key error')
    } catch (e) {
      const err = e as Error & { cause?: { code?: string } }
      expect(err.cause?.code === '23505' || /unique|duplicate/i.test(err.message)).toBe(true)
    }
  })
})
