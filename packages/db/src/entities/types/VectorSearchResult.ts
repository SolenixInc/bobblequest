import type { Embedding } from './Embedding.ts'

/**
 * Single hit from `EmbeddingStore.search(...)`.
 *
 * `similarity` is `1 - cosineDistance` so higher is closer; the
 * consumer-facing `minSimilarity` floor applies to this value, not to
 * the raw distance.
 */
export interface VectorSearchResult {
  readonly embedding: Embedding
  readonly similarity: number
}
