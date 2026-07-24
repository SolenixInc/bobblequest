import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '__tests__/**',
        'vitest.config.ts',
        '**/index.ts',
        // types-only files (no executable code)
        'delivery/types/ErrorWithStatusCode.ts',
        'entities/schemas/AppErrorOptions.ts',
        'entities/schemas/UnknownError.ts',
        // ambient type declaration files (no executable code)
        '**/*.d.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 97,
        functions: 100,
        lines: 100,
      },
    },
  },
})
