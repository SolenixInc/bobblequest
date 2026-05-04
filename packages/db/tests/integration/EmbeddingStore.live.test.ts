import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { EmbeddingStore } from '../../src/entities/ports/EmbeddingStore.ts'
import { DEFAULT_EMBEDDING_DIMENSIONS } from '../../src/entities/schemas/embeddings.ts'
import { DrizzleDbClientImpl } from '../../src/infrastructure/drizzle/DrizzleDbClientImpl.ts'
import { DrizzleEmbeddingStoreImpl } from '../../src/infrastructure/drizzle/DrizzleEmbeddingStoreImpl.ts'
import {
  closeTestClient,
  getTestClient,
  isDbAvailable,
  runMigrations,
  truncateTables,
} from './setup.ts'

const available = await isDbAvailable()

function vec(dim: number, idx: number, val: number): number[] {
  const v = new Array(dim).fill(0)
  v[idx] = val
  return v
}

describe.skipIf(!available)('DrizzleEmbeddingStoreImpl (live Postgres + pgvector)', () => {
  let store: DrizzleEmbeddingStoreImpl

  beforeAll(async () => {
    const sql = await getTestClient()
    await runMigrations(sql)
    const client = new DrizzleDbClientImpl({ client: sql })
    store = new DrizzleEmbeddingStoreImpl(client)
  })

  beforeEach(async () => {
    const sql = await getTestClient()
    await truncateTables(sql)
  })

  afterAll(async () => {
    await closeTestClient()
  })

  it('is an instance of EmbeddingStore', () => {
    expect(store).toBeInstanceOf(EmbeddingStore)
  })

  it('upserts and finds an embedding', async () => {
    const emb = await store.upsert({
      sourceType: 'doc',
      sourceId: 'doc-1',
      content: 'hello world',
      vector: vec(DEFAULT_EMBEDDING_DIMENSIONS, 0, 1),
    })
    expect(emb.id).toBeTypeOf('string')
    const found = await store.findById(emb.id)
    expect(found).not.toBeNull()
    expect(found?.vector[0]).toBe(1)
  })

  it('searches by cosine similarity', async () => {
    const close = await store.upsert({
      sourceType: 's',
      sourceId: '1',
      content: 'close match',
      vector: vec(DEFAULT_EMBEDDING_DIMENSIONS, 0, 1),
    })
    const far = await store.upsert({
      sourceType: 's',
      sourceId: '2',
      content: 'far match',
      vector: vec(DEFAULT_EMBEDDING_DIMENSIONS, 1, 1),
    })

    const results = await store.search({
      embedding: vec(DEFAULT_EMBEDDING_DIMENSIONS, 0, 1),
      k: 2,
    })

    expect(results).toHaveLength(2)
    expect(results[0]?.embedding.id).toBe(close.id)
    expect(results[0]?.similarity).toBeCloseTo(1, 5)
    expect(results[1]?.embedding.id).toBe(far.id)
  })

  it('search respects minSimilarity floor', async () => {
    const match = await store.upsert({
      sourceType: 's',
      sourceId: '1',
      content: 'match',
      vector: vec(DEFAULT_EMBEDDING_DIMENSIONS, 0, 1),
    })
    await store.upsert({
      sourceType: 's',
      sourceId: '2',
      content: 'orthogonal',
      vector: vec(DEFAULT_EMBEDDING_DIMENSIONS, 1, 1),
    })

    const results = await store.search({
      embedding: vec(DEFAULT_EMBEDDING_DIMENSIONS, 0, 1),
      k: 5,
      minSimilarity: 0.5,
    })

    expect(results).toHaveLength(1)
    expect(results[0]?.embedding.id).toBe(match.id)
  })

  it('deletes an embedding', async () => {
    const emb = await store.upsert({
      sourceType: 's',
      sourceId: 'del',
      content: 'delete me',
      vector: vec(DEFAULT_EMBEDDING_DIMENSIONS, 0, 1),
    })
    await store.delete(emb.id)
    expect(await store.findById(emb.id)).toBeNull()
  })

  it('search with k<=0 returns empty', async () => {
    expect(
      await store.search({ embedding: vec(DEFAULT_EMBEDDING_DIMENSIONS, 0, 1), k: 0 }),
    ).toEqual([])
  })
})
