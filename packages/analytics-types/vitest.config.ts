import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        'src/ports/AnalyticsTracker.ts',
        'src/ports/RequestAnalyticsTracker.ts',
        'src/types/AnalyticsTrackerOptions.ts',
        'src/types/Environment.ts',
        'src/types/LlmEvent.ts',
        'src/types/RevenueEvent.ts',
        'src/types/Service.ts',
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
