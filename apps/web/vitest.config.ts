import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx',
    ],
    environment: 'jsdom',
    globals: false,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/components/ui/**',
        'src/middleware.ts',
        // Pure re-export barrels, no branching logic to cover.
        'src/lib/browserLogger.ts',
        'src/lib/clerk.ts',
      ],
      thresholds: {
        statements: 99,
        branches: 97,
        functions: 100,
        lines: 100,
      },
    },
  },
})
