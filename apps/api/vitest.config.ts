import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Exclude integration tests from the unit run; they are opt-in via
    // `bun run test:integration` (--project integration).
    include: ['src/**/*.test.ts', '!src/__tests__/integration/**/*.test.ts'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/__tests__/**',
        // Entrypoints — cannot be unit-tested without a full runtime
        'src/index.ts',
        'src/worker.ts',
        'src/cron.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/__tests__/integration/**/*.test.ts'],
          setupFiles: ['src/__tests__/setup.ts'],
          environment: 'node',
          globals: false,
          clearMocks: true,
        },
      },
    ],
  },
})
