import { describe, expect, it, vi } from 'vitest'
import { EmbeddingStore } from '../../src/entities/ports/EmbeddingStore.ts'
import type { DrizzleDbClientImpl } from '../../src/infrastructure/drizzle/DrizzleDbClientImpl.ts'
import { DrizzleEmbeddingStoreImpl } from '../../src/infrastructure/drizzle/DrizzleEmbeddingStoreImpl.ts'

// ---------------------------------------------------------------------------
// Fake query builder chain
// ---------------------------------------------------------------------------

function makeEmbeddingRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'e-1',
    sourceType: 'document',
    sourceId: 'doc-1',
    chunkIndex: 0,
    content: 'hello',
    metadata: null,
    embedding: [1, 0, 0],
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function makeDrizzleMock(returnRows: unknown[]) {
  const chain = {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  }

  // select chain: .select({...}).from().where?().orderBy?().limit?()
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnRows),
  }
  chain.select.mockReturnValue(selectChain)

  // insert chain: .insert().values().returning()
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnRows),
  }
  chain.insert.mockReturnValue(insertChain)

  // delete chain: .delete().where()
  const deleteChain = {
    where: vi.fn().mockResolvedValue(undefined),
  }
  chain.delete.mockReturnValue(deleteChain)

  return { chain, selectChain }
}

function makeClient(rows: unknown[]) {
  const { chain, selectChain } = makeDrizzleMock(rows)
  const client = {
    getDrizzle: vi.fn().mockReturnValue(chain),
  } as unknown as DrizzleDbClientImpl
  return { client, chain, selectChain }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DrizzleEmbeddingStoreImpl', () => {
  it('is an instance of EmbeddingStore port', () => {
    const { client } = makeClient([])
    expect(new DrizzleEmbeddingStoreImpl(client)).toBeInstanceOf(EmbeddingStore)
  })

  it('upsert returns domain embedding from insert returning', async () => {
    const row = makeEmbeddingRow()
    const { client } = makeClient([row])
    const store = new DrizzleEmbeddingStoreImpl(client)
    const result = await store.upsert({
      sourceType: 'document',
      sourceId: 'doc-1',
      content: 'hello',
      vector: [1, 0, 0],
    })
    expect(result.id).toBe('e-1')
    expect(result.vector).toEqual([1, 0, 0])
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('upsert with explicit id passes it through', async () => {
    const row = makeEmbeddingRow({ id: 'custom-id' })
    const { client } = makeClient([row])
    const store = new DrizzleEmbeddingStoreImpl(client)
    const result = await store.upsert({
      id: 'custom-id',
      sourceType: 's',
      sourceId: '1',
      content: 'c',
      vector: [1],
    })
    expect(result.id).toBe('custom-id')
  })

  it('upsert throws when insert returns no row', async () => {
    const { client } = makeClient([])
    const store = new DrizzleEmbeddingStoreImpl(client)
    await expect(
      store.upsert({ sourceType: 's', sourceId: '1', content: 'c', vector: [1] }),
    ).rejects.toThrow(/insert returned no row/)
  })

  it('findById returns null when no row found', async () => {
    const { client } = makeClient([])
    const store = new DrizzleEmbeddingStoreImpl(client)
    expect(await store.findById('missing')).toBeNull()
  })

  it('findById returns domain embedding when found', async () => {
    const row = makeEmbeddingRow()
    const { client } = makeClient([row])
    const store = new DrizzleEmbeddingStoreImpl(client)
    const result = await store.findById('e-1')
    expect(result?.id).toBe('e-1')
    expect(result?.sourceType).toBe('document')
  })

  it('search with k<=0 returns [] immediately', async () => {
    const { client } = makeClient([])
    const store = new DrizzleEmbeddingStoreImpl(client)
    expect(await store.search({ embedding: [1], k: 0 })).toEqual([])
    expect(client.getDrizzle).not.toHaveBeenCalled()
  })

  it('search without minSimilarity calls base query', async () => {
    const { client, selectChain } = makeClient([{ row: makeEmbeddingRow(), similarity: 0.99 }])
    const store = new DrizzleEmbeddingStoreImpl(client)
    const results = await store.search({ embedding: [1, 0, 0], k: 5 })
    expect(results).toHaveLength(1)
    expect(results[0]?.similarity).toBe(0.99)
    expect(selectChain.where).not.toHaveBeenCalled()
  })

  it('search with minSimilarity calls where() to filter', async () => {
    const { client, selectChain } = makeClient([{ row: makeEmbeddingRow(), similarity: 0.8 }])
    const store = new DrizzleEmbeddingStoreImpl(client)
    const results = await store.search({ embedding: [1, 0, 0], k: 5, minSimilarity: 0.5 })
    expect(results).toHaveLength(1)
    expect(selectChain.where).toHaveBeenCalled()
  })

  it('delete calls delete().where()', async () => {
    const { client, chain } = makeClient([])
    const store = new DrizzleEmbeddingStoreImpl(client)
    await expect(store.delete('e-1')).resolves.toBeUndefined()
    expect(chain.delete).toHaveBeenCalled()
  })

  it('toDomain maps null embedding to []', async () => {
    const row = makeEmbeddingRow({ embedding: null, metadata: { key: 'val' } })
    const { client } = makeClient([row])
    const store = new DrizzleEmbeddingStoreImpl(client)
    const result = await store.findById('e-1')
    expect(result?.vector).toEqual([])
    expect(result?.metadata).toEqual({ key: 'val' })
  })

  it('upsert with metadata stores it', async () => {
    const row = makeEmbeddingRow({ metadata: { tag: 'test' } })
    const { client } = makeClient([row])
    const store = new DrizzleEmbeddingStoreImpl(client)
    const result = await store.upsert({
      sourceType: 's',
      sourceId: '1',
      content: 'c',
      vector: [1],
      metadata: { tag: 'test' },
    })
    expect(result.metadata).toEqual({ tag: 'test' })
  })
})
