---
paths:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}"
  - "**/__tests__/**"
  - "**/vitest.config.{ts,js,mts}"
  - "**/bunfig.toml"
  - "**/package.json"
---

# Testing runner — vitest only

- Runner: vitest (only).
- Forbidden: `bun:test` imports, `bun test` invocations, `bunfig.toml` `[test]` preload block.
- package.json scripts (every package and app):
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
- Config: each package/app needs `vitest.config.ts` mirroring `packages/logging/vitest.config.ts`.
  - `include: ['**/__tests__/**/*.test.ts']` (or equivalent for tsx)
  - `environment: 'node'`
  - `globals: false`
  - `clearMocks: true`
  - Reference setup files via `setupFiles`.
- Imports: tests import from `'vitest'`. Mocks use `vi.fn()`, `vi.mock()`, `vi.stubEnv()`. No `mock(...)` from `bun:test`.
- devDependencies: include `vitest` (current repo version: ^2.1.0). Do not add `@types/bun`.
- Root `bunfig.toml`: `[install]` block allowed (workspace/lockfile/cache config). `[test]` block forbidden.
- Verification command: `turbo run test --filter=<pkg-name>`.

Reason: User directive 2026-04-25 — mixed runners cause CI signal drift; consumers forking this scaffold inherit one harness.
