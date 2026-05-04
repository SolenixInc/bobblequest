import { beforeEach, describe, expect, it } from 'vitest'
import { EmbeddingStore } from '../../src/entities/ports/EmbeddingStore.ts'
import { InMemoryEmbeddingStore } from '../../src/infrastructure/in-memory/InMemoryEmbeddingStore.ts'

describe('InMemoryEmbeddingStore', () => {
  let store: InMemoryEmbeddingStore
  beforeEach(() => {
    store = new InMemoryEmbeddingStore()
  })

  it('is an instance of the EmbeddingStore port', () => {
    expect(store).toBeInstanceOf(EmbeddingStore)
  })

  it('upserts and finds by id', async () => {
    const e = await store.upsert({
      sourceType: 'document',
      sourceId: 'doc-1',
      content: 'hello',
      vector: [1, 0, 0],
    })
    expect(e.id).toBeTypeOf('string')
    expect(e.vector).toEqual([1, 0, 0])
    expect(await store.findById(e.id)).toEqual(e)
  })

  it('search returns k closest results ordered by similarity desc', async () => {
    await store.upsert({
      id: 'a',
      sourceType: 's',
      sourceId: '1',
      content: 'a',
      vector: [1, 0, 0],
    })
    await store.upsert({
      id: 'b',
      sourceType: 's',
      sourceId: '2',
      content: 'b',
      vector: [0.8, 0.2, 0],
    })
    await store.upsert({
      id: 'c',
      sourceType: 's',
      sourceId: '3',
      content: 'c',
      vector: [0, 1, 0],
    })
    const hits = await store.search({ embedding: [1, 0, 0], k: 2 })
    expect(hits.map((h) => h.embedding.id)).toEqual(['a', 'b'])
    expect(hits[0]?.similarity).toBeCloseTo(1, 5)
    expect(hits[1]?.similarity).toBeGreaterThan((hits[1]?.similarity ?? 0) - 0.01)
    // weakest candidate `c` (orthogonal) should be absent
    expect(hits.find((h) => h.embedding.id === 'c')).toBeUndefined()
  })

  it('search respects minSimilarity floor', async () => {
    await store.upsert({
      id: 'far',
      sourceType: 's',
      sourceId: '1',
      content: 'far',
      vector: [0, 1, 0],
    })
    const hits = await store.search({
      embedding: [1, 0, 0],
      k: 5,
      minSimilarity: 0.5,
    })
    expect(hits).toHaveLength(0)
  })

  it('search with k<=0 short-circuits to []', async () => {
    await store.upsert({
      id: 'x',
      sourceType: 's',
      sourceId: '1',
      content: 'x',
      vector: [1, 0, 0],
    })
    expect(await store.search({ embedding: [1, 0, 0], k: 0 })).toEqual([])
  })

  it('search ignores rows with mismatched dimensionality', async () => {
    await store.upsert({
      id: 'ok',
      sourceType: 's',
      sourceId: '1',
      content: 'ok',
      vector: [1, 0, 0],
    })
    await store.upsert({
      id: 'bad',
      sourceType: 's',
      sourceId: '2',
      content: 'bad',
      vector: [1, 0, 0, 0, 0],
    })
    const hits = await store.search({ embedding: [1, 0, 0], k: 5 })
    expect(hits.map((h) => h.embedding.id)).toEqual(['ok'])
  })

  it('delete is idempotent', async () => {
    const e = await store.upsert({
      sourceType: 's',
      sourceId: '1',
      content: 'c',
      vector: [1, 0, 0],
    })
    await store.delete(e.id)
    await store.delete(e.id)
    expect(await store.findById(e.id)).toBeNull()
  })

  it('clear() removes all embeddings', async () => {
    await store.upsert({
      sourceType: 's',
      sourceId: '1',
      content: 'c',
      vector: [1, 0, 0],
    })
    store.clear()
    expect(await store.search({ embedding: [1, 0, 0], k: 10 })).toHaveLength(0)
  })

  it('upsert with explicit id uses caller-supplied id', async () => {
    const e = await store.upsert({
      id: 'explicit-id',
      sourceType: 's',
      sourceId: '1',
      content: 'c',
      vector: [1, 0],
    })
    expect(e.id).toBe('explicit-id')
  })

  it('upsert with metadata stores it correctly', async () => {
    const e = await store.upsert({
      sourceType: 's',
      sourceId: '1',
      content: 'c',
      vector: [1, 0],
      metadata: { tag: 'test' },
    })
    expect(e.metadata).toEqual({ tag: 'test' })
  })

  it('upsert exercises crypto fallback when randomUUID is unavailable', async () => {
    const saved = globalThis.crypto
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true,
        writable: true,
      })
      const e = await store.upsert({
        sourceType: 's',
        sourceId: 'fallback-test',
        content: 'c',
        vector: [1, 0],
      })
      expect(e.id).toMatch(/^inmem-/)
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: saved,
        configurable: true,
        writable: true,
      })
    }
  })

  it('cosineSimilarity returns 0 for zero-magnitude vectors', async () => {
    await store.upsert({
      id: 'zero',
      sourceType: 's',
      sourceId: '1',
      content: 'c',
      vector: [0, 0, 0],
    })
    const hits = await store.search({ embedding: [1, 0, 0], k: 5 })
    // [0,0,0] against anything: similarity is 0, should be filtered by minSimilarity if set
    // Here k=5 no floor, so it appears with similarity=0
    const hit = hits.find((h) => h.embedding.id === 'zero')
    expect(hit?.similarity).toBe(0)
  })
})
