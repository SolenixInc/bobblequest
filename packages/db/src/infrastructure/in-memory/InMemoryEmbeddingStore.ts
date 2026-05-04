import { EmbeddingStore } from '../../entities/ports/EmbeddingStore.ts'
import type { CreateEmbeddingInput, Embedding } from '../../entities/types/Embedding.ts'
import type { VectorSearchResult } from '../../entities/types/VectorSearchResult.ts'

/**
 * In-memory `EmbeddingStore` used for tests. Computes cosine similarity
 * in JS — fine for small fixture sets, inappropriate for anything
 * larger than ~10k rows.
 *
 * Rationale: keeps unit tests of call sites (routers, workers) free of
 * Postgres / pgvector while still exercising the `search()` contract
 * end-to-end.
 */
export class InMemoryEmbeddingStore extends EmbeddingStore {
  private readonly store = new Map<string, Embedding>()

  async upsert(input: CreateEmbeddingInput): Promise<Embedding> {
    const now = new Date()
    const embedding: Embedding = {
      id: input.id ?? cryptoRandomUuid(),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      chunkIndex: input.chunkIndex ?? 0,
      content: input.content,
      metadata: input.metadata ?? null,
      vector: [...input.vector],
      createdAt: now,
    }
    this.store.set(embedding.id, embedding)
    return embedding
  }

  async findById(id: string): Promise<Embedding | null> {
    return this.store.get(id) ?? null
  }

  async search(args: {
    readonly embedding: readonly number[]
    readonly k: number
    readonly minSimilarity?: number
  }): Promise<readonly VectorSearchResult[]> {
    if (args.k <= 0) return []
    const query = args.embedding
    const scored: VectorSearchResult[] = []
    for (const row of this.store.values()) {
      if (row.vector.length !== query.length) continue
      const similarity = cosineSimilarity(row.vector, query)
      if (args.minSimilarity !== undefined && similarity <= args.minSimilarity) {
        continue
      }
      scored.push({ embedding: row, similarity })
    }
    scored.sort((a, b) => b.similarity - a.similarity)
    return scored.slice(0, args.k)
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  /** Test helper: empty the store between cases. */
  clear(): void {
    this.store.clear()
  }
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    /* v8 ignore next */
    const x = a[i] ?? 0
    /* v8 ignore next */
    const y = b[i] ?? 0
    dot += x * y
    magA += x * x
    magB += y * y
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

function cryptoRandomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `inmem-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
