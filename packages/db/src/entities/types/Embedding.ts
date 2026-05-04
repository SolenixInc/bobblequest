/**
 * Domain-level `Embedding` row — plain TS shape consumed by callers
 * who should not import Drizzle directly.
 *
 * `vector` is returned as `readonly number[]` (not a `Float32Array`) so
 * JSON-serialization and equality comparisons behave predictably in
 * tests and logs.
 */
export interface Embedding {
  readonly id: string
  readonly sourceType: string
  readonly sourceId: string
  readonly chunkIndex: number
  readonly content: string
  readonly metadata: Record<string, unknown> | null
  readonly vector: readonly number[]
  readonly createdAt: Date
}

/** Caller-supplied fields on upsert. `id` / `createdAt` are server-set. */
export interface CreateEmbeddingInput {
  readonly id?: string
  readonly sourceType: string
  readonly sourceId: string
  readonly chunkIndex?: number
  readonly content: string
  readonly metadata?: Record<string, unknown>
  readonly vector: readonly number[]
}
