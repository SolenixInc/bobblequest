import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Stub postgres-js and drizzle adapter at the module boundary
// ---------------------------------------------------------------------------

type FakeSql = {
  unsafe: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  options: { parsers: Record<number, unknown> }
}

let fakeSql: FakeSql

vi.mock('postgres', () => ({
  default: vi.fn(() => fakeSql),
}))

let fakeTransaction: ReturnType<typeof vi.fn>
let fakeExecute: ReturnType<typeof vi.fn>

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({
    transaction: (...args: unknown[]) => fakeTransaction(...args),
    execute: (...args: unknown[]) => fakeExecute(...args),
  })),
}))

// ---------------------------------------------------------------------------
// SUT import — after mocks
// ---------------------------------------------------------------------------

import { DbClient } from '../../src/entities/ports/DbClient.ts'
import { DrizzleDbClientImpl } from '../../src/infrastructure/drizzle/DrizzleDbClientImpl.ts'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DrizzleDbClientImpl', () => {
  beforeEach(() => {
    fakeSql = {
      unsafe: vi.fn().mockResolvedValue([{ result: 1 }]),
      end: vi.fn().mockResolvedValue(undefined),
      options: { parsers: {} },
    }
    fakeTransaction = vi.fn()
    fakeExecute = vi.fn()
  })

  it('is an instance of DbClient port', () => {
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    expect(client).toBeInstanceOf(DbClient)
  })

  it('constructor throws when no client or url', () => {
    expect(() => new DrizzleDbClientImpl({})).toThrow(/client.*url.*required/i)
  })

  it('getDrizzle returns the drizzle query builder', () => {
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    expect(client.getDrizzle()).toBeDefined()
  })

  it('transaction wraps fn in db.transaction and returns result', async () => {
    fakeTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        session: { client: fakeSql },
      })
    })
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    const result = await client.transaction(async (tx) => {
      expect(tx).toBeInstanceOf(DbClient)
      return 42
    })
    expect(result).toBe(42)
  })

  it('transaction falls back to outer client when tx has no session.client', async () => {
    // Pass a tx object without session so `session?.client` is undefined,
    // exercising the `?? this.client` fallback branch on line 91.
    fakeTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({})
    })
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    const result = await client.transaction(async (tx) => {
      expect(tx).toBeInstanceOf(DbClient)
      return 'fallback'
    })
    expect(result).toBe('fallback')
  })

  it('transaction child has close() neutralized', async () => {
    let capturedChild: DbClient | undefined
    fakeTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        session: { client: fakeSql },
      })
    })
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    await client.transaction(async (tx) => {
      capturedChild = tx
    })
    // close() on the transaction child should be a no-op (not drain the pool)
    await expect(capturedChild?.close()).resolves.toBeUndefined()
    expect(fakeSql.end).not.toHaveBeenCalled()
  })

  it('ping returns true when execute returns a non-empty array', async () => {
    fakeExecute.mockResolvedValue([{ ok: 1 }])
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    expect(await client.ping()).toBe(true)
  })

  it('ping returns true when execute returns a non-array (truthy)', async () => {
    fakeExecute.mockResolvedValue({ rows: [] })
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    expect(await client.ping()).toBe(true)
  })

  it('ping returns false when execute returns an empty array', async () => {
    fakeExecute.mockResolvedValue([])
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    expect(await client.ping()).toBe(false)
  })

  it('close calls client.end with timeout', async () => {
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    await client.close()
    expect(fakeSql.end).toHaveBeenCalledWith({ timeout: 5 })
  })

  it('raw calls client.unsafe with query and params', async () => {
    fakeSql.unsafe.mockResolvedValue([{ id: '1' }])
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    const result = await client.raw('SELECT id FROM users WHERE id = $1', ['123'])
    expect(fakeSql.unsafe).toHaveBeenCalledWith('SELECT id FROM users WHERE id = $1', ['123'])
    expect(result).toEqual([{ id: '1' }])
  })

  it('raw with no params defaults to empty array', async () => {
    fakeSql.unsafe.mockResolvedValue([])
    const client = new DrizzleDbClientImpl({ url: 'postgres://localhost/db' })
    await client.raw('SELECT 1')
    expect(fakeSql.unsafe).toHaveBeenCalledWith('SELECT 1', [])
  })

  it('constructs from pre-built client option (bypasses url logic)', () => {
    const prebuilt = {
      unsafe: vi.fn(),
      end: vi.fn(),
      options: { parsers: {} },
    }
    expect(
      () => new DrizzleDbClientImpl({ client: prebuilt as unknown as typeof fakeSql }),
    ).not.toThrow()
  })
})
