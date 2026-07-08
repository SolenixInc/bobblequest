import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const packageRoot = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup/stubLogging.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      // Vitest 4's coverage.include is matched with picomatch's `contains: true`
      // mode, i.e. unanchored substring matching against the full absolute file
      // path. A plain relative pattern like 'src/**/*.ts' therefore also matches
      // sibling workspace packages reached through @t/analytics-types' barrel
      // re-exports (e.g. packages/analytics-types/src/ports/AnalyticsTracker.ts),
      // since that path also contains a 'src/**/*.ts' suffix. Anchoring the
      // pattern to this package's own absolute directory keeps the match scoped
      // to packages/analytics/src only.
      include: [resolve(packageRoot, 'src/**/*.ts')],
      exclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        'src/entities/ports/AnalyticsTracker.ts',
        'src/entities/ports/RequestAnalyticsTracker.ts',
        'src/entities/types/AnalyticsTrackerOptions.ts',
        'src/entities/types/Environment.ts',
        'src/entities/types/LlmEvent.ts',
        'src/entities/types/RevenueEvent.ts',
        'src/entities/types/Service.ts',
        'src/entities/types/ReservedSuperProps.ts',
        'src/entities/schemas/EventSchema.ts',
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
