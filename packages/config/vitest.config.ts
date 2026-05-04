import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['**/*.ts'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        'vitest.config.ts',
        '**/index.ts',
        'tailwind.config.ts',
        'entities/types/ConfigTypes.ts',
        '**/entities/ports/ConfigRepository.ts',
        '**/entities/schemas/WebsiteConfigSchema.ts',
        '**/entities/schemas/WebConfigValuesSchema.ts',
        '**/entities/schemas/DesktopConfigValuesSchema.ts',
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
