import { cosineDistance, desc, eq, gt, sql } from 'drizzle-orm'
import { EmbeddingStore } from '../../entities/ports/EmbeddingStore.ts'
import { type EmbeddingRow, embeddings } from '../../entities/schemas/embeddings.ts'
import type { CreateEmbeddingInput, Embedding } from '../../entities/types/Embedding.ts'
import type { VectorSearchResult } from '../../entities/types/VectorSearchResult.ts'
import type { DrizzleDbClientImpl } from './DrizzleDbClientImpl.ts'

/**
 * Drizzle-backed `EmbeddingStore` impl using pgvector's HNSW index via
 * `cosineDistance(...)` and the `vector_cosine_ops` operator class
 * defined in `entities/schemas/embeddings.ts`.
 */
export class DrizzleEmbeddingStoreImpl extends EmbeddingStore {
  constructor(private readonly client: DrizzleDbClientImpl) {
    super()
  }

  async upsert(input: CreateEmbeddingInput): Promise<Embedding> {
    const [row] = await this.client
      .getDrizzle()
      .insert(embeddings)
      .values({
        ...(input.id ? { id: input.id } : {}),
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        chunkIndex: input.chunkIndex ?? 0,
        content: input.content,
        metadata: input.metadata ?? null,
        embedding: Array.from(input.vector),
      })
      .returning()
    if (!row) throw new Error('DrizzleEmbeddingStoreImpl: insert returned no row')
    return toDomain(row)
  }

  async findById(id: string): Promise<Embedding | null> {
    const [row] = await this.client
      .getDrizzle()
      .select()
      .from(embeddings)
      .where(eq(embeddings.id, id))
      .limit(1)
    return row ? toDomain(row) : null
  }

  async search(args: {
    readonly embedding: readonly number[]
    readonly k: number
    readonly minSimilarity?: number
  }): Promise<readonly VectorSearchResult[]> {
    if (args.k <= 0) return []
    const queryVec = Array.from(args.embedding)
    const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryVec)})`

    const base = this.client.getDrizzle().select({ row: embeddings, similarity }).from(embeddings)

    const rows = await (args.minSimilarity !== undefined
      ? base.where(gt(similarity, args.minSimilarity))
      : base
    )
      .orderBy(desc(similarity))
      .limit(args.k)

    return rows.map((r) => ({
      embedding: toDomain(r.row),
      similarity: Number(r.similarity),
    }))
  }

  async delete(id: string): Promise<void> {
    await this.client.getDrizzle().delete(embeddings).where(eq(embeddings.id, id))
  }
}

function toDomain(row: EmbeddingRow): Embedding {
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    chunkIndex: row.chunkIndex,
    content: row.content,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    vector: row.embedding ?? [],
    createdAt: row.createdAt,
  }
}
