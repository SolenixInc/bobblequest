import { index, integer, jsonb, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'

/**
 * Default embedding dimensionality. 1536 matches OpenAI
 * `text-embedding-3-small`; bump (or move to per-row `dimensions`) if
 * you adopt a model with a different output size.
 *
 * Exported so app-side code / tests can assert vectors match before
 * calling `EmbeddingStore.upsert(...)`.
 */
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536

/**
 * `embeddings` table — pgvector-backed k-NN store.
 *
 * One row per indexed chunk. `sourceType` + `sourceId` identify the
 * parent artifact (e.g. `'document' / '<doc_uuid>'`), so the index can
 * host multiple model outputs side-by-side. `chunkIndex` preserves
 * order when a source produces more than one chunk.
 *
 * HNSW index uses `vector_cosine_ops` — matches the `cosineDistance`
 * helper used in `DrizzleEmbeddingStoreImpl.search(...)` and the
 * `minSimilarity` floor surfaced on the port.
 *
 * Requires `CREATE EXTENSION IF NOT EXISTS vector` to have run first.
 */
export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    chunkIndex: integer('chunk_index').notNull().default(0),
    content: text('content').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    embedding: vector('embedding', {
      dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('embeddings_source_idx').on(table.sourceType, table.sourceId),
    index('embeddings_hnsw_cosine_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
)

export type EmbeddingRow = typeof embeddings.$inferSelect
export type EmbeddingInsert = typeof embeddings.$inferInsert
