import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const packagesRoot = resolve(__dirname, '../../packages')
const appsRoot = resolve(__dirname, '..')

// Resolve @t/<pkg> to src/ if it exists, otherwise fall back to the package root.
// Searches packages/ first, then apps/ (e.g. @t/api lives in apps/api).
function resolveWorkspacePackage(pkg: string): string {
  for (const root of [packagesRoot, appsRoot]) {
    const srcDir = resolve(root, pkg, 'src')
    if (existsSync(srcDir)) return srcDir
    const pkgDir = resolve(root, pkg)
    if (existsSync(pkgDir)) return pkgDir
  }
  return resolve(packagesRoot, pkg)
}

export default defineConfig({
  resolve: {
    alias: [
      // Explicit alias for @t/api — its package.json only declares a `types`
      // export condition (no runtime entry), so vite's default node resolver
      // throws "No known conditions for '.' specifier". Point it at the
      // routers entry directly so type-only imports erase cleanly.
      {
        find: '@t/api',
        replacement: resolve(appsRoot, 'api', 'src', 'routers', 'index.ts'),
      },
      // Map @t/<pkg> to the package's src/ dir when it exists, else the package root.
      {
        find: /^@t\/([^/]+)(\/.*)?$/,
        replacement: '',
        customResolver(source) {
          const match = source.match(/^@t\/([^/]+)(\/.*)?$/)
          if (!match) return null
          const [, pkg, sub] = match
          const base = resolveWorkspacePackage(pkg)
          return resolve(base, sub ?? '')
        },
      },
    ],
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
    testTimeout: 60_000,
    passWithNoTests: true,
    globals: false,
    clearMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.d.ts',
        'src/__tests__/setup.ts',
        'src/types/**',
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
