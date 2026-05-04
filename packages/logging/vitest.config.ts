import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', '*.ts'],
      exclude: ['**/*.test.ts', '__tests__/**', 'vitest.config.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
