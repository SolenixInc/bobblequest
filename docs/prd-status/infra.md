---
name: monorepo infra & tooling status
last_audited: 2026-04-27
maintainer_contract: any agent editing root tooling, CI, workspace config, or turbo.json MUST update this file and docs/prd-status/matrix.md
---

# Monorepo infra & tooling — status

## Workspace

- Package manager: **Bun workspaces** (`packageManager: "bun@1.3.11"`, `workspaces: ["apps/*",
  "packages/*"]`)
- Root `bunfig.toml`: `install.workspace=true`, `lockfile=true`, cache in `node_modules/.cache`.
  `[test]` block stripped 2026-04-25 (repo is Vitest-only); orphaned root `test/setup.ts` deleted
  with the empty `test/` dir.
- `apps/api/bunfig.toml`: **deleted 2026-04-25** as part of the Vitest-only migration. Per-app test
  setup now lives in `apps/api/vitest.config.ts` (`setupFiles: ['./src/__tests__/setup.ts']`).
- Workspace members: `apps/{api,web,website,desktop,mobile}`, `packages/*` (config, db, logging,
  errors, analytics, auth, billing, cache — per git status)
- `bun.lock` present (~3.8k lines, ~430 KB); committed

## Build graph

- Turborepo present: **`turbo.json`** at root, schema 2.x (`turbo@^2.0.0` devDep)
- Tasks:
  - `build`: `dependsOn: ["^build"]`, outputs `.next/**` (minus cache) + `dist/**`
  - `dev`: `cache:false`, `persistent:true`
  - `check`: `dependsOn: ["^check"]` (biome lint)
  - `typecheck`: `dependsOn: ["^typecheck"]` (tsc --noEmit)
  - `format`: no deps (biome check --write -- lint + format)
  - `test`: `dependsOn: ["^build"]`, outputs `coverage/**`
  - `clean`: `cache:false`
- `globalDependencies: ["**/.env.*local"]`
- No remote cache configured (no `remoteCache`/`signature` in turbo.json, no Vercel link)

## Type checking

- Base: `tsconfig.base.json` at root extends `./packages/config/tsconfig/base.json`; declares
  `paths: { "@t/*": ["./packages/*/src", "./packages/*"] }`
- Every app has its own `tsconfig.json` extending either `../../tsconfig.base.json` (api, desktop,
  mobile) or `../../packages/config/tsconfig/nextjs.json` (web, website)
- App-local alias `@/*` → `./src/*` in all apps; `@t/*` alias redeclared in desktop + mobile
- Desktop uses `composite: true` with project references (`tsconfig.node.json`)
- Mobile has `noEmit: true`, `jsx: "react-native"`, `types: ["nativewind/types"]`
- Cross-workspace typecheck: `bun run typecheck` → `turbo run typecheck` → each package's `tsc
  --noEmit`

## Lint / format

- **Biome** only (per AGENTS.md: ESLint + Prettier banned). `@biomejs/biome ^1.9.0` pinned at root +
  every app + `packages/config`
- Root `biome.json` extends `./packages/config/biome.json` (shared rules live in config package)
- Per-package scripts: `check` → `biome check .`, `format` → `biome check --write .` (standardized
  across all 18 packages/apps, added `check`/`format` to `@t/config` and `@t/billing` where they
  were missing)

## Testing

- **Unit:** Vitest (repo-standard 2026-04-25; no `bun:test` anywhere). Per-package test setup lives
  in each `vitest.config.ts` (`apps/api/vitest.config.ts` `setupFiles:
  ['./src/__tests__/setup.ts']`).
- **E2E:** Playwright (`@playwright/test ^1.59.1` in `apps/web`), config at
  `apps/web/playwright.config.ts`, specs in `apps/web/e2e/`
- `apps/api` and `@t/config` migrated to Vitest 2026-04-25;
  `@t/auth`/`@t/analytics`/`@t/cache`/`@t/billing`/`@t/logging` already on Vitest. All
  `apps/*/package.json` files (api, web, website, desktop, mobile) declare `"test": "vitest run"` —
  turbo `test` pipeline is fully wired across all 5 apps (21 tasks total, verified green
  2026-04-27).
- Test runners per package must be declared via `scripts.test` for turbo pipeline to pick them up

## CI

- `.github/workflows/ci.yml` — triggers: push to `main`, PR targeting `main`; concurrency cancels
  in-progress on non-main refs
- Bun version pinned: `1.3.11` via `oven-sh/setup-bun@v2.2.0`; checkout `actions/checkout@v6.0.2`
- `TURBO_TELEMETRY_DISABLED=1` global env
- Jobs (all depend on `setup`, which computes a `--filter=...[origin/<base>...HEAD]` for PRs, empty
  for push):
  - `setup` — compute turbo filter
  - `lint` — `bunx turbo run check <filter>` (10 min)
  - `typecheck` — `bunx turbo run typecheck <filter>` (10 min)
  - `test` — `bunx turbo run test <filter>` (15 min)
  - `build` — `bunx turbo run build <filter>` (20 min)
  - `e2e` — needs `setup + build`; affected-path gate (`apps/web/|packages/`), runs `bunx playwright
    install --with-deps chromium` then `bunx playwright test` in `apps/web`; uploads
    `playwright-report/` artifact (7 days)
- OS matrix: **`ubuntu-latest` only** (no Windows/macOS)
- **Service containers in CI:** `test` job includes Postgres service container
  (`pgvector/pgvector:pg17`) for `@t/db` integration tests (wired 2026-04-27); `drizzle-check` job
  also includes Postgres. Redis service container (`redis:8.0-alpine`, port 6380, `--requirepass
  redispassword`) wired 2026-04-28 to unblock `@t/cache` integration tests.

## Gaps / drift

- **No remote Turbo cache** — every CI job re-runs from cold; with 5 apps + ≥8 packages this will be
  painful. Consider Vercel remote cache or self-hosted (see `turborepo-caching` skill)
- ~~**Apps missing `test` scripts**~~ **DONE 2026-04-27** — all 5 apps (api, web, website, desktop,
  mobile) declare `"test": "vitest run"`. `bun turbo run test` runs 21 tasks, all passing.
- **`@t/*` path alias is inconsistent** — root `tsconfig.base.json` declares `@t/*` but
  CONVENTIONS.md and AGENTS.md both say to import from `@t/*` via workspace deps. Verify resolution
  works uniformly (desktop + mobile redeclare it locally, api does not, web/website inherit from
  nextjs preset)
- **Release Please automated** — Google's Release Please action configured in
  `.github/workflows/release.yml`, triggered on push to `main`. Scans conventional commits since
  last tag, creates a "Release vX.Y.Z" PR with version bumps + CHANGELOG. Merging the PR
  auto-creates a GitHub Release + git tag. Post-release step regenerates `bun.lock`. Config:
  `release-please-config.json`, `.release-please-manifest.json`. Single version for entire monorepo
  via `node-workspace` plugin. Zero overhead — devs only write conventional commit messages.
- **CI uses untagged-latest caveat** — `oven-sh/setup-bun@v2.2.0` and `actions/checkout@v6.0.2` are
  pinned (good); but `bun-version: 1.3.11` is hardcoded in 4 places and can drift
- **`.env.*local` is the only globalDependency** — secrets changes in `.env` (non-local) don't bust
  turbo cache
- ~~**`format` script inconsistency** — website/desktop/mobile ran `biome check --write .` while
  api/web ran `biome format --write .`.~~ **DONE 2026-04-27** — all 18 packages/apps standardized to
  `biome check --write .`; missing `check`/`format` scripts added to `@t/config` and `@t/billing`.
- ~~**Root `clean` script** uses `rm -rf` (POSIX) — will break on Windows pwsh.~~ **DONE
  2026-04-27** — swapped to `rimraf`, added `rimraf ^6.0.0` to root devDependencies.

## Notes for next agent

- Update this file whenever you touch: root `package.json`, `turbo.json`, `tsconfig.base.json`,
  `biome.json`, root `bunfig.toml`, `.github/workflows/*.yml`, or any app's `package.json` scripts
  section
- Also update `docs/prd-status/matrix.md` when workspace members are added/removed
- Before adding ESLint/Prettier/Jest, re-read AGENTS.md "Banned" section — those are non-negotiable
  exclusions. (Vitest is the repo-standard test runner as of 2026-04-25.)
- If adding test coverage: declare `"test": "vitest run"` in each app's `package.json` and wire
  setup files via that workspace's `vitest.config.ts` (`setupFiles: [...]`). Do NOT reintroduce
  `bun:test` or a `[test]` block in any `bunfig.toml`.
- If adopting Turbo remote cache: `turbo login && turbo link`, then document the team/org handle
  here

## Audit fix pass — 2026-04-27

Landed:

- `aa28eda` fix(docs): repair UTF-8 mojibake in root markdown files (216 substitutions)
- `d194d11` fix(mcp): use repo-relative path so graphify works on every clone
- `a217fe3` chore(agents): merge dup ASCII rule, regen rules index, update HANDOFF, add
  filesystem-precedence pointer
- `9c69f93` chore(biome): dedupe analytics-types + logging-types config to extends-only
- `2e9eb63` chore(repo): add .editorconfig, .gitattributes, CODEOWNERS, PR template, .tool-versions,
  license=UNLICENSED
- `612a28c` chore(build): tighten turbo cache (globalPassThroughEnv, globalDependencies, typecheck
  inputs, build outputs), fix tsconfig @t/* path drift
- `4e0da0f` docs: add apps/web/README, packages/logging-browser/README, docs/README, MADR v4 ADR
  template
- `3370c89` docs(readme): regen tree (5 apps + 17 packages), normalize {{...}} placeholders, add
  private-internal note
- `4425010` ci: harden permissions (least-privilege), add CodeQL workflow (javascript-typescript),
  pin all actions to SHA, document release-please PAT requirement; also migrated
  `packages/config/biome.json` to v2.4.13 schema as a hook-blocker fix
- `ecbf333` chore(ci): swap renovate for dependabot (lower-friction default — no GitHub App install
  required)

Verification (sentinel): 8 of 9 checks pass. One unrelated blocker in pre-existing test code; see
gaps.md.
