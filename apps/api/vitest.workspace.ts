import { defineWorkspace } from 'vitest/config'

/**
 * Vitest workspace configuration for apps/api.
 *
 * Projects:
 *  - unit        — fast, in-process unit tests (excludes integration/ dir)
 *  - integration — full Hono app + in-memory repos, opt-in via --project integration
 *
 * Run integration only:
 *   bun run test:integration
 *   # or: bunx vitest run --project integration
 */
export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['src/**/*.test.ts'],
      exclude: ['src/__tests__/integration/**/*.test.ts'],
      setupFiles: ['src/__tests__/setup.ts'],
      environment: 'node',
      globals: false,
      clearMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: [
          'src/**/*.test.ts',
          'src/__tests__/**',
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
    },
  },
  {
    test: {
      name: 'integration',
      include: ['src/__tests__/integration/**/*.test.ts'],
      setupFiles: ['src/__tests__/setup.ts'],
      environment: 'node',
      globals: false,
      clearMocks: true,
    },
  },
])
