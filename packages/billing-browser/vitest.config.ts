import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const root = resolve(__dirname, '../..')

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @t/* workspace packages for Vitest (Vite doesn't follow bun
      // workspace symlinks; we point it directly to the source).
      '@t/billing': resolve(root, 'packages/billing/src/index.ts'),
      '@t/config': resolve(root, 'packages/config/src/index.ts'),
      '@t/dependency-injection': resolve(root, 'packages/dependency-injection/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['./tests/setup/stubLogging.ts'],
    environment: 'jsdom',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/index.ts',
        'src/**/react/index.ts',
        'src/infrastructure/NoOpBillingTracker.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
