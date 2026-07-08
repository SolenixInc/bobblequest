import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // tsconfig uses "jsx": "preserve" (required by Next.js); esbuild would fall
  // back to the classic runtime, breaking components that never import React.
  // Match Next.js by compiling JSX with the automatic runtime.
  esbuild: { jsx: 'automatic' },
  test: {
    setupFiles: ['./src/__test__/setup.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx',
    ],
    exclude: ['e2e/**'],
    environment: 'jsdom',
    globals: false,
    clearMocks: true,
    passWithNoTests: true,
    // Composition tests spin up a full DI container (winston + optional OTLP setup)
    // which can take >1s under parallel turbo load. 15s covers the worst case.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        // TypeScript declaration files — not executable code
        '**/*.d.ts',
        'src/types/**',
        // Next.js App Router files — require full Next.js runtime
        'src/app/**',
        // Route handlers with complex Next.js types
        'src/app/api/**',
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
