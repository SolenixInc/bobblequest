import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup/stubLogging.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        // types-only files (no executable code)
        'src/entities/types/AuthHandlerOptions.ts',
        'src/entities/types/AuthSyncCallback.ts',
        'src/entities/types/AuthProviderOptions.ts',
        'src/entities/types/UserSyncCallback.ts',
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
