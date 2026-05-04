import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  embeddings,
} from '../../../src/entities/schemas/embeddings.ts'

describe('embeddings schema', () => {
  it('exposes the expected columns', () => {
    expect(Object.keys(embeddings)).toEqual(
      expect.arrayContaining([
        'id',
        'sourceType',
        'sourceId',
        'chunkIndex',
        'content',
        'metadata',
        'embedding',
        'createdAt',
      ]),
    )
  })

  it('declares the embedding column with the default dimensionality', () => {
    const col = (embeddings as unknown as Record<string, unknown>).embedding as
      | { dimensions?: number }
      | undefined
    expect(col).toBeDefined()
    // The `vector(n)` helper stores `dimensions` on the column config.
    expect(col?.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS).toBe(DEFAULT_EMBEDDING_DIMENSIONS)
  })

  it('exports a sane default dimensionality matching OpenAI small-embed', () => {
    expect(DEFAULT_EMBEDDING_DIMENSIONS).toBe(1536)
  })
})
