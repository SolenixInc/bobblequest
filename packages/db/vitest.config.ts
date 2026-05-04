import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/integration/**'],
    setupFiles: ['./tests/setup/stubLogging.ts'],
    environment: 'node',
    globals: false,
    // Integration tests share a single Postgres database; parallel file
    // execution causes cross-file truncation races. Sequential file order
    // keeps unit tests (all in-memory) fast enough that this is not a concern.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        // Pure interface / type files — no executable code
        'src/entities/types/Embedding.ts',
        'src/entities/types/Project.ts',
        'src/entities/types/User.ts',
        'src/entities/types/VectorSearchResult.ts',
        // Drizzle schema index callbacks run at module init time but v8 cannot
        // instrument them reliably as regular function calls
        'src/entities/schemas/embeddings.ts',
        'src/entities/schemas/projects.ts',
        'src/entities/schemas/users.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
