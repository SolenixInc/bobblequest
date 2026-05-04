import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DbClient } from '../../src/entities/ports/DbClient.ts'
import { DrizzleDbClientImpl } from '../../src/infrastructure/drizzle/DrizzleDbClientImpl.ts'
import {
  closeTestClient,
  getTestClient,
  isDbAvailable,
  runMigrations,
  truncateTables,
} from './setup.ts'

const available = await isDbAvailable()

describe.skipIf(!available)('DrizzleDbClientImpl (live Postgres)', () => {
  let client: DrizzleDbClientImpl

  beforeAll(async () => {
    const sql = await getTestClient()
    await runMigrations(sql)
    client = new DrizzleDbClientImpl({ client: sql })
  })

  beforeEach(async () => {
    const sql = await getTestClient()
    await truncateTables(sql)
  })

  afterAll(async () => {
    await client?.close()
    await closeTestClient()
  })

  it('is an instance of DbClient', () => {
    expect(client).toBeInstanceOf(DbClient)
  })

  it('ping returns true', async () => {
    expect(await client.ping()).toBe(true)
  })

  it('raw executes a query and returns rows', async () => {
    const rows = await client.raw('SELECT 1 as ok')
    expect(rows).toEqual([{ ok: 1 }])
  })

  it('raw with params binds positional values', async () => {
    const rows = await client.raw('SELECT $1 as val', ['hello'])
    expect(rows).toEqual([{ val: 'hello' }])
  })

  it('transaction commits on success', async () => {
    const result = await client.transaction(async (tx) => {
      await tx.raw('INSERT INTO users (clerk_user_id, email) VALUES ($1, $2)', [
        'tx_user',
        'tx@example.com',
      ])
      return 42
    })
    expect(result).toBe(42)

    const rows = await client.raw('SELECT clerk_user_id FROM users WHERE clerk_user_id = $1', [
      'tx_user',
    ])
    expect(rows).toHaveLength(1)
  })

  it('transaction rolls back on throw', async () => {
    await expect(
      client.transaction(async (tx) => {
        await tx.raw('INSERT INTO users (clerk_user_id, email) VALUES ($1, $2)', [
          'rollback_user',
          'rb@example.com',
        ])
        throw new Error('intentional')
      }),
    ).rejects.toThrow('intentional')

    const rows = await client.raw('SELECT clerk_user_id FROM users WHERE clerk_user_id = $1', [
      'rollback_user',
    ])
    expect(rows).toHaveLength(0)
  })
})
