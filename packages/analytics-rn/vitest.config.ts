import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const root = resolve(__dirname, '../..')

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @t/* workspace packages for Vitest (Vite doesn't follow bun
      // workspace symlinks; we point it directly to the source).
      '@t/analytics-types': resolve(root, 'packages/analytics-types/src/index.ts'),
      '@t/config': resolve(root, 'packages/config/src/index.ts'),
      '@t/dependency-injection': resolve(root, 'packages/dependency-injection/src/index.ts'),
      '@t/logging-types': resolve(root, 'packages/logging-types/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/__test__/stubLogging.ts'],
    // jsdom environment: React hook tests use @testing-library/react renderHook which needs DOM.
    environment: 'jsdom',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/index.ts',
        'src/__test__/**',
        'src/infrastructure/NoOpAnalyticsTracker.ts',
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
