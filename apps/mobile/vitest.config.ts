import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'react-native': resolve(__dirname, './src/__tests__/mocks/react-native.ts'),
      'react-native-purchases': resolve(
        __dirname,
        './src/__tests__/mocks/react-native-purchases.ts',
      ),
      'posthog-react-native': resolve(__dirname, './src/__tests__/mocks/posthog-react-native.ts'),
      // Ensure a single React instance across @testing-library/react and components
      // (prevents "invalid hook call" from duplicate React copies in the monorepo).
      react: resolve(__dirname, '../../node_modules/react'),
      'react-dom': resolve(__dirname, '../../node_modules/react-dom'),
    },
  },
  define: {
    // React Native's global __DEV__ flag — always true in test (development) mode.
    __DEV__: true,
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx',
    ],
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/__tests__/**', 'src/**/*.d.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
