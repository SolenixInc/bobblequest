---
name: CI check suite status
last_audited: 2026-04-30
maintainer_contract: any agent editing .github/workflows/**, root CI scripts, turbo.json tasks, or pre-commit hooks MUST update this file and docs/prd-status/matrix.md
---

# CI Check Suite — target state & gaps

**Scope.** The full check suite that should run on every PR and push to main, how it should run
selectively/smartly on monorepo changes, and what's currently missing.

## Target state (what "done" looks like)

### Check tiers

Fast tier (seconds; must be green before anything else runs; fail-fast):

- **Format**: `biome format --check` across workspace
- **Lint**: `biome check` across workspace
- **Commit lint**: conventional-commits validation on PR titles + recent commits
- **Secret scan**: gitleaks on diff
- **Dependency lockfile integrity**: bun.lock unchanged unless package.json changed

Correctness tier (minutes; fail-complete):

- **Typecheck**: `turbo run typecheck` across affected packages
- **Unit tests**: `turbo run test` with coverage collection
- **Integration tests**: `turbo run test:integration` (db, cache, external mocks)
- **Build**: `turbo run build` — catches type errors in emit + bundler failures
- **Unused exports / dead code**: knip (or equivalent) across workspace
- **Circular imports**: madge --circular

Full-stack tier (only on affected apps; can run in parallel shard):

- **E2E web**: playwright against `apps/web` + `apps/website`
- **E2E mobile**: Maestro or Detox where applicable (document decision)
- **E2E desktop**: spectron/playwright-electron (document decision)

Security / hygiene tier (runs on main + nightly; can be informational on PR):

- **Dependency vulnerability audit**: `bun audit` + OSV-Scanner for transitive
- **License check**: reject GPL/AGPL in production deps
- **SBOM generation**: CycloneDX, uploaded as artifact
- **Bundle size budget**: bundlesize or size-limit per app
- **Stale dependency report**: npm-check-updates summary (informational)

### Selective execution strategy (monorepo best practices)

**PRs** — run only what the diff touches:

- Use `turbo run <task> --filter=[origin/main...HEAD]` so only affected packages/apps run.
- Turborepo `globalDependencies` must cover: `.env.*`, `bun.lock`, `turbo.json`, `tsconfig*.json`,
  `biome.json`, root `package.json`, `.github/workflows/**` — any change there invalidates cache for
  everything.
- E2E tier runs only if the affected graph includes an app.
- Fast tier (format/lint/secret) always runs on full diff — it's cheap.

**Main branch pushes** — run everything unfiltered:

- `turbo run <task>` without `--filter` → full matrix.
- Security tier runs here + nightly schedule.

**Caching**:

- Local turbo cache restored from GHA cache action, keyed on `bun.lock` hash + workflow file hash.
- Remote turbo cache wired via `TURBO_TOKEN`/`TURBO_TEAM` env (active).

**Concurrency**:

- `concurrency.group: ci-${{ github.ref }}` + `cancel-in-progress: true` on PRs.
- Main branch never cancels in progress.

**Matrix**:

- ubuntu-latest for everything except Electron e2e (adds macos + windows).
- No Node version matrix — Bun-only runtime per AGENTS.md.

### Required status checks (branch protection on main)

- Format, Lint, Typecheck, Unit tests, Build must be green to merge.
- Integration / E2E required only if diff touches their app.
- Security tier is informational on PR, required on main.

### Governance

- @changesets/cli: every PR adds a changeset file unless labeled `no-changeset`.
- PR must link an issue or be labeled `trivial`.
- Auto-label by changed paths (path-labeler GHA).

## Current state

### ✅ Shipped (landed 2026-04-26)

#### Core tooling

- Turbo filters for lint/typecheck/test/build/e2e on PR diff
- Ubuntu-only runners with pinned action versions
- Biome configured for lint + format
- `test` + `test:coverage` scripts wired in every app and package
- Format-check step (`biome format --check`) in fast tier
- Secret scan (gitleaks) on diff
- Concurrency `cancel-in-progress: true` on PRs
- Coverage artifacts uploaded to Codecov
- 100% statement/branch/function/line coverage enforced on `packages/*` and `apps/api`
- 100/100/100/100 coverage achieved in `apps/desktop` (2026-04-30); `vitest.config.ts` thresholds
  flip 0 → 100 in Track D (in flight, separate commit)
- Coverage thresholds at 0 for `apps/web`, `apps/website`, `apps/mobile`
- `apps/mobile` vitest config carries `passWithNoTests: true`
- `apps/api` build uses `--target=node` for Node.js builtins (ioredis, postgres)

#### Jobs (previously undocumented, now reflected)

- `setup` job (turbo filter compute for selective execution)
- `drizzle-check` job (schema validation)
- `bun audit` job (dependency vulnerability scan)

#### Turbo + caching

- GHA cache action (`actions/cache@v4`) on all 6 turbo-invoking jobs
- Cache key: `turbo-${{ runner.os }}-${{ hashFiles('bun.lock', '.github/workflows/ci.yml',
  'turbo.json') }}`
- Matrix typecheck job namespaces by `${{ matrix.app }}`
- `globalDependencies` expanded in turbo.json: `bun.lock`, `package.json`, `.github/workflows/**`
- Remote turbo cache wired via `TURBO_TOKEN`/`TURBO_TEAM` env

#### Pre-commit gate (local mirror)

- **lefthook v2.1.6** installed at repo root (`lefthook.yml`)
- Pre-commit (parallel): format-check, lint, typecheck, test, secret-scan (gitleaks protect
  --staged; gracefully skips when binary absent)
- Commit-msg: commitlint --edit {1}
- Auto-installs on `bun install` via `prepare` script
- commitlint moved to root devDependencies: `@commitlint/cli@^20.5.2`,
  `@commitlint/config-conventional@^20.5.0`; config in `commitlint.config.mjs`

**`--filter=...[HEAD]` semantics (RTFM-verified against turborepo Rust parser source, 2026-04-28):**

- `[HEAD]` (single ref, no `to`) → `include_uncommitted: true` → captures staged + unstaged
  working-tree changes vs HEAD.
- `...` prefix → `include_dependents: true` → adds every package that imports the changed ones.
- Net effect: edit `packages/config/src/foo.ts`, get `@t/config` + every package that imports it.
  Scope is the touched-package closure — not the full monorepo.
- This makes it the right scope for a pre-commit affected-packages gate; it does not run
  monorepo-wide.

Runs **locally** (pre-commit):

- `biome format` on staged files
- `biome check` on staged files
- `turbo run typecheck --filter=...[HEAD] --output-logs=errors-only` (affected packages +
  dependents)
- `turbo run test --filter=...[HEAD] --output-logs=errors-only` (affected packages + dependents)
- `gitleaks protect --staged` (gracefully skips if binary absent)
- `commitlint` on commit message (commit-msg hook)

Runs **in CI only** (`.github/workflows/ci.yml`):

- `turbo run typecheck` (affected packages via `--filter=[origin/main...HEAD]`)
- `turbo run test` with coverage (affected packages)
- `turbo run build` (affected apps/packages)
- Integration tests, E2E, size-limit, bun audit, drizzle-check, gitleaks full scan

#### Drift cleanup

- biome.json `files.ignore` expanded for `.agents/**` and `graphify-out/**`
- Test override glob covers both `**/tests/**` and `**/__tests__/**` for `noExplicitAny` +
  `noNonNullAssertion`
- Source legitimately fixed in error.tsx (Error→RouteError, button type), buildErrorMetadata.ts
  (any→unknown), ConfigRepositoryImpl.ts (z.ZodTypeAny)
- 7 stale biome-ignore suppressions removed
- TS error fixed in apps/api lifecycle.test.ts (handler array types widened to canonical
  NodeJS.UnhandledRejectionListener / UncaughtExceptionListener)
- Playwright e2e specs (home, auth-routes with Clerk env skip) verified clean against current
  Clerk-based reality

### 🟡 In progress

_None._

#### Bundle-size budget (landed 2026-04-26)

- **size-limit v12** wired at repo root: `size-limit ^12.1.0`, `@size-limit/preset-app ^12.0.0`,
  `@size-limit/file ^12.1.0` in root `devDependencies`.
- `apps/web`: `"size"` script + `"size-limit"` field — budget **1800 kB** on `.next/static/**/*.js`
  (baseline 1506 kB + 20% headroom; brotli measured at 399 kB).
- `apps/api`: `"size"` script + `"size-limit"` field — budget **4600 kB** on `dist/index.js`
  (baseline 3762 kB + 20%; brotli 517 kB).
- New `size-limit` job in `.github/workflows/ci.yml` depends on `[setup, build]`, turbo-filtered to
  apps/web, apps/api, packages/. Sequential web build → web check → api build → api check. Matches
  existing job style (`checkout@v6.0.2`, `setup-bun@v2.2.0`, frozen-lockfile, turbo cache,
  `timeout-minutes: 15`). Local `bunx size-limit` PASS for both apps.
- **Known follow-up:** the in-flight `packages/config/infrastructure/ConfigRepositoryImpl.ts` change
  (visible as `M` in `git status`, not yet committed) introduces a webpack error — the
  `node:process` URI scheme does not resolve under the apps/web build. Until that refactor lands,
  the new `size-limit` job's web build step will fail on any PR carrying the change. Tracked
  separately; do not roll the size-limit job back.

### ⏳ Deferred (P2)

- **E2E expansion (website/mobile/desktop)**: website needs blog ready first; mobile/desktop need
  EAS + device matrices and platform-specific skill investment.

### ⏳ Deferred (P3)

- **Integration test tier**: Postgres and Redis service containers now wired (2026-04-28); unblocked
  for `@t/db` and `@t/cache`. Remaining blocker: app-layer integration tests not yet written.
- **madge (circular import detection)**: use when code complexity warrants.
- **knip (unused exports)**: use when code complexity warrants.
- **License check**: allow/deny list not yet scoped.
- **SBOM generation**: compliance-tier item.
- **Stale dependency report**: informational only.

## Completion

**~95%** — core CI stack, local pre-commit gate, commit-lint, and bundle-size budget (size-limit
v12) all shipped; remaining items (E2E expansion, integration test tier, knip/madge, license check,
SBOM, stale dep report) are genuinely deferred P2/P3 post-MVP additions.

## Monorepo best-practice reference notes

- Turbo filters: `--filter=[origin/main...HEAD]` for affected-only on PR.
- Don't use `--parallel` for correctness tier; let the dep graph order it.
- Cache key must include workflow file hash so changes to ci.yml invalidate.
- Keep fast tier under 60s — it's the one that blocks every other tier.
- Separate jobs ≠ separate runners; use `needs:` + shared runner with a setup step for cache
  locality.

## Notes for next agent

- Before proposing a CI overhaul, read `infra.md` and `architecture-intent.md`.
- When you add or remove a check, update matrix.md's CI row and the deferred lists above.
- If you discover a new gap, add it inline with a `[ ]`; don't batch.
