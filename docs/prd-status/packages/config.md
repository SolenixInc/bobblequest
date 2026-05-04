---
name: config bootstrap status
last_audited: 2026-04-26
maintainer_contract: any agent editing packages/config/** or apps/*/config wiring MUST update this file and docs/prd-status/matrix.md
---

# @t/config — bootstrap status

**Package status:** ✅ shipped 2026-04-26 — all schemas landed, 100% Vitest coverage (116 tests, 8
spec files), wired into `apps/api` composition root, no legacy carryovers.

## Intended

- Port: `ConfigRepository` — one readonly accessor per subsystem + `getAll(): ConfigValues`.
- Impl: `process.env` reader, validates composite at ctor via `ConfigValuesSchema.parse` then
  re-parses each subsystem slice inside its getter (fail-fast at boot + fail-fast on first access).
- Source: `docs/architecture/platform/config.md` (canonical clean-architecture reference module).

## Actual

- `entities/ports/ConfigRepository.ts` + `entities/ports/index.ts`
- `entities/schemas/` (13 schemas, all re-exported via `schemas/index.ts`):
  - `EnvironmentSchema.ts` — `"development" | "local" | "testing" | "production"`, default `"development"` (`staging` removed 2026-04-26)
  - `SystemConfigSchema.ts` — env, log level, port, ai url, tokens (`mongoUri` removed 2026-04-26; `isLocal` now `environment === 'local' || environment === 'development'`)
  - `AuthConfigSchema.ts`
  - `StripeConfigSchema.ts`
  - `AppleConfigSchema.ts`
  - `AppStoreConfigSchema.ts`
  - `AndroidConfigSchema.ts`
  - `PostHogConfigSchema.ts`
  - `AnalyticsConfigSchema.ts`
  - `LoggingConfigSchema.ts`
  - `RevenueCatConfigSchema.ts` — includes `webhookAuthHeader` (env:
    `REVENUECAT_WEBHOOK_AUTH_HEADER`) added 2026-04-26
  - `RedisConfigSchema.ts`
  - `DesktopConfigValuesSchema.ts` — renderer-agnostic main-process schema (env, log level, port).
    Added 2026-04-26 alongside `resolveDesktopConfig` for `apps/desktop` wiring.
  - `WebConfigValuesSchema.ts` — apps/web client-safe schema exposing `client: { trpcUrl }` (sourced
    from `NEXT_PUBLIC_TRPC_URL`). Added 2026-04-26 (commits `6cd7c69` schema + `f518fe1` apps/web
    wiring); consumed by `apps/web/src/lib/trpc/provider.tsx` so the browser bundle no longer reads
    `process.env.NEXT_PUBLIC_TRPC_URL` directly.
  - `ConfigValuesSchema.ts` *(composite — `gcp` field removed 2026-04-26)*
- `entities/types/ConfigTypes.ts` — re-exports all Zod-inferred types: `AnalyticsConfig`,
  `AuthConfig`, `DbConfig`, `LoggingConfig`, `RedisConfig`, `RevenueCatConfig` (all added
  2026-04-26; `GCPConfig` removed).
- `entities/index.ts` re-exports ports/schemas/types.
- `infrastructure/ConfigRepositoryImpl.ts` + `infrastructure/index.ts`.
- `dependency-injection/registerConfigRepoDI.ts` — `registerConfigRepo(container)` binds
  `ConfigRepositoryImpl` under `dependencyKeys.global.CONFIG` as singleton via
  `asClass(...).singleton()` from `@t/dependency-injection`.
- `index.ts` re-exports `./entities`, `./infrastructure`,
  `./dependency-injection/registerConfigRepoDI.ts`.
- Tests: 8 spec files under `entities/schemas/__tests__/`, 116 tests, 100%/100%/100%/100% coverage
  thresholds (Vitest v8). `apps/api` 94/94 tests still pass.
- `package.json`: name `@t/config`, `"test": "vitest run"`, dep `zod ^3.23.0`, dep
  `@t/dependency-injection`. `package.json` `exports` declares the `"."` entry (landed 2026-04-25).

## Consumer hooks

- **DI-first:** `registerConfigRepo(container)` from `@t/config` — binds under
  `dependencyKeys.global.CONFIG`. No free `loadConfig()` helper; consumers must resolve `CONFIG`
  from the container.
- **Schemas** exported as named exports through `packages/config/index.ts` → `./entities` →
  `./entities/schemas/index.ts` (e.g. `import { AnalyticsConfigSchema, resolveAnalyticsConfig } from
  "@t/config"`).
- **Types** inferred from schemas, re-exported via `entities/types/ConfigTypes.ts`. Exported types:
  `AnalyticsConfig`, `AuthConfig`, `DbConfig`, `LoggingConfig`, `RedisConfig`, `RevenueCatConfig`
  (and the remaining subsystem types).
- **Port:** `ConfigRepository` interface exported from `entities/ports/ConfigRepository.ts`.
- **`apps/api` reads `config.revenueCat.webhookAuthHeader`** — consumed by
  `apps/api/src/routes/webhooks/revenuecat.ts` (passed into `verifyRevenueCatWebhook` from
  `@t/billing`). No bare `process.env` reads for this value.

## Gaps vs docs

- ~~**Not wired into `apps/api` composition root.**~~ **Done 2026-04-25** — `registerConfigRepo` is
  the first registrar called by `apps/api/src/composition.ts#buildContainer()`.
- ~~**Test coverage sparse.**~~ **Done 2026-04-26** — 116 tests, 8 spec files, 100% coverage on all
  thresholds.
- ~~**Legacy carryovers.**~~ **Done 2026-04-26** — `GCPConfigSchema` deleted; `gcp` port accessor /
  `ConfigValuesSchema` field / type removed; `K_SERVICE` sentinel replaced; `mongoUri` dropped.
- ~~**`ConfigTypes.ts` out of sync.**~~ **Done 2026-04-26** — all 6 missing types added; `GCPConfig`
  removed.
- ~~**`REVENUECAT_WEBHOOK_AUTH_HEADER` missing from schema.**~~ **Done 2026-04-26** —
  `webhookAuthHeader` on `RevenueCatConfigSchema`.
- ~~**Environment enum drift.**~~ **Resolved 2026-04-26** — on-disk canonical values (`development|local|testing|production`) documented; docs reconciled. `staging` dropped entirely 2026-04-26.
- ~~**No `README.md`.**~~ **Done 2026-04-26** — `packages/config/README.md` created as the canonical
  "how to build a platform module" walkthrough.
- **`RailwayConfigSchema` / `BillingConfigSchema` not added** — decision 2026-04-26: `databaseUrl`
  lives on `DbConfigSchema`; billing is fully covered by `RevenueCatConfigSchema` +
  `StripeConfigSchema`. These placeholders are closed, not deferred.
- **Package overloaded.** `@t/config` also exports biome / tailwind / tsconfig configs — conflates
  "tooling config" with the "runtime config port". Out of scope for this pass.

## Per-app schema inventory

- **`apps/api`** — uses composite `ConfigValuesSchema` via `registerConfigRepo`.
- **`apps/web`** — client-safe `WebConfigValuesSchema` (added 2026-04-26 via `6cd7c69` + `f518fe1`)
  exposes `client: { trpcUrl }` from `NEXT_PUBLIC_TRPC_URL`; consumed by
  `apps/web/src/lib/trpc/provider.tsx`. Server-side composition root continues to use the full
  `ConfigValuesSchema` via `registerConfigRepo`.
- **`apps/desktop`** — main process uses `DesktopConfigValuesSchema` + `resolveDesktopConfig` (added
  2026-04-26) inside `apps/desktop/src/main/composition.ts#buildContainer()`. Renderer env reads
  (`VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`) currently fail loud at module load; a Zod-based
  renderer schema is deferred.

## Changelog

- **2026-04-26** — `WebConfigValuesSchema` added (`6cd7c69` schema, `f518fe1` apps/web wiring):
  `client: { trpcUrl }` sourced from `NEXT_PUBLIC_TRPC_URL`; `apps/web/src/lib/trpc/provider.tsx`
  now reads it through `@t/config` instead of bare `process.env`.
- **2026-04-26** — `DesktopConfigValuesSchema` + `resolveDesktopConfig` added (apps/desktop wiring);
  main-process composition root validates env at boot.
- **2026-04-26** — `staging` dropped from `EnvironmentSchema` (5-value → 4-value: `development|local|testing|production`). All downstream consumers updated: `@t/analytics` `Environment` type, `registerDbDI`, `registerAuthDI`, `registerAnalyticsDI`, `@t/errors` response transformers, tests across 8 spec files. Docs reconciled. Zero `staging` references remain in source.
- **2026-04-26** — GCP/legacy cleanup shipped: `GCPConfigSchema` deleted; `mongoUri` dropped;
  `K_SERVICE` sentinel replaced; `webhookAuthHeader` added to `RevenueCatConfigSchema`;
  `ConfigTypes.ts` completed; 116 tests / 100% coverage; `README.md` created.
- **2026-04-25** — Vitest migration, composition root wiring, `exports` fix, DI dep added.

## Notes for next agent

- The DI registrar imports from `@t/dependency-injection` — `dependencyKeys.global.CONFIG` is the
  agreed contract.
- Repo test convention is Vitest; this package's specs are on Vitest. Do NOT reintroduce `bun:test`.
- Before touching `SystemConfigSchema`, remember it underpins every downstream module's `isLocal` /
  `logLevel` / `port` reads — sweep callers across `packages/*` when renaming or removing keys.
- Any change to the port surface (add/remove subsystem accessor) requires: schema + type re-export +
  impl getter + `getAll()` + `ConfigValuesSchema` composite + registrar unchanged + this file's
  "Actual" section.
