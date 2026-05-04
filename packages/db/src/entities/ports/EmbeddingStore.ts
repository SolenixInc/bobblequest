import type { CreateEmbeddingInput, Embedding } from '../types/Embedding.ts'
import type { VectorSearchResult } from '../types/VectorSearchResult.ts'

/**
 * Abstract repository port for the `embeddings` table (pgvector-backed).
 *
 * Provides upsert + k-NN similarity search. Callers supply a pre-computed
 * embedding vector — this port does NOT call out to any embedding model;
 * that's the responsibility of `@t/ai`.
 *
 * Implementations:
 *   - `DrizzleEmbeddingStoreImpl` — uses Drizzle's `vector` column type
 *     + `cosineDistance` helper against a pgvector HNSW index.
 *   - `InMemoryEmbeddingStore` — computes cosine distance in JS over a
 *     Map<id, vector>. Used for unit tests.
 *
 * Distance metric: cosine (1 - cosine similarity). Matches the HNSW
 * index defined in `embeddings` with `vector_cosine_ops`.
 */
export abstract class EmbeddingStore {
  /**
   * Insert a new embedding row. Throws on unique-constraint violation
   * if the caller supplied a pre-existing id.
   */
  abstract upsert(input: CreateEmbeddingInput): Promise<Embedding>

  /** Find an embedding by its primary key. */
  abstract findById(id: string): Promise<Embedding | null>

  /**
   * k-Nearest-Neighbour search by cosine distance. Returns `k` rows
   * ordered by ascending distance (closest first). Optional
   * `minSimilarity` (0..1 where 1 = identical) applies a hard floor
   * on `1 - distance` — rows below the floor are excluded.
   */
  abstract search(args: {
    readonly embedding: readonly number[]
    readonly k: number
    readonly minSimilarity?: number
  }): Promise<readonly VectorSearchResult[]>

  /** Delete an embedding. Idempotent. */
  abstract delete(id: string): Promise<void>
}
