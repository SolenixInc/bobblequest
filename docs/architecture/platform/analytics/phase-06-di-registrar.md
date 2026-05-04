# Phase 06 — DI Registrar

## Goal

Implement `registerAnalyticsDI(container, opts)` with an options-bag API
and the 4-branch selection logic from the analytics spec. Replace the old
`registerAnalyticsClientDI.ts` and rename the DI key from `ANALYTICS_CLIENT`
to `ANALYTICS`.

## Blocked by

- Phase 05 (ports + impls + NoOp + request-scope tracker all landed).

## Blocks

- Phase 07 (tests cover the selection branches introduced here).

## Preconditions

- `PostHogAnalyticsTrackerImpl` exists and takes an options-bag ctor
  (`{ environment, service, apiKey, host, enabled }`).
- `NoOpAnalyticsTracker` exists and honors the same ctor guards.
- `RequestAnalyticsTrackerImpl` exists for per-request stamping.
- `AnalyticsConfigSchema` (Zod) lives in `src/config/` and is re-exported.
- `@t/logging` exposes a `logger` usable at composition time.

## Checklist

- [x] Create `src/dependency-injection/registerAnalyticsDI.ts`.
- [x] Signature:
      `registerAnalyticsDI(container: AwilixContainer, opts: { config: ConfigRepository,
      environment: Environment, service: Service }): void`.
- [x] Import `AnalyticsConfigSchema` + both impls
      (`PostHogAnalyticsTrackerImpl`, `NoOpAnalyticsTracker`) +
      `RequestAnalyticsTrackerImpl`.
- [x] Selection logic, IN THIS ORDER:
  - [x] `environment === "testing"` → register `NoOpAnalyticsTracker`.
  - [x] `config.analytics.enabled === false` → register
        `NoOpAnalyticsTracker`.
  - [x] `!config.analytics.apiKey` → register `NoOpAnalyticsTracker`
        AND call `logger.warn(...)` via `@t/logging` with a clear
        message that analytics is disabled because no API key is set.
  - [x] otherwise → register
        `PostHogAnalyticsTrackerImpl({ environment, service, apiKey, host, enabled: true })`.
- [x] Lifetime: `asClass(...).singleton()` for the global tracker.
- [x] Key: `dependencyKeys.global.ANALYTICS` — rename from
      `ANALYTICS_CLIENT` at the definition site.
- [x] Locate the `dependencyKeys` definition:
      `grep -r "ANALYTICS_CLIENT" packages/ apps/` — update every
      reference (definition + all call sites).
- [x] Register `RequestAnalyticsTrackerImpl` with `scoped` lifetime for
      per-request resolution. Document that the app-level middleware that
      creates the per-request scope is owned by Phase 2 (composition root).
- [x] Delete old `packages/analytics/dependency-injection/registerAnalyticsClientDI.ts`.
- [x] Remove the legacy `DISABLE_POSTHOG_OTLP` env-var branch — it is
      NOT in the Phase-1 spec and has no equivalent here.
- [x] Export `registerAnalyticsDI` from `packages/analytics/src/index.ts`.
- [x] Verify no re-export of the old `registerAnalyticsClientDI` symbol
      remains anywhere in the package.

```text
opts -> branch selection
 |
 +-- environment == "testing"     --> NoOp   (singleton)
 +-- config.analytics.enabled==0  --> NoOp   (singleton)
 +-- !config.analytics.apiKey     --> NoOp + logger.warn
 +-- else                         --> PostHogAnalyticsTrackerImpl
                                      (singleton, opts bag)
```

## Files touched

- `packages/analytics/src/dependency-injection/registerAnalyticsDI.ts` (create)
- `packages/analytics/src/index.ts` (export `registerAnalyticsDI`)
- `packages/analytics/dependency-injection/registerAnalyticsClientDI.ts` (delete)
- `dependencyKeys` definition file (wherever it lives — discover via grep)
- Any call site currently using `dependencyKeys.global.ANALYTICS_CLIENT`
  (rename to `ANALYTICS`).

## Verification

- `bun run tsc --noEmit` exits 0 at the repo root.
- `grep -r "ANALYTICS_CLIENT" packages/ apps/` returns zero hits.
- `grep -r "registerAnalyticsClientDI" packages/ apps/` returns zero hits.
- `grep -r "DISABLE_POSTHOG_OTLP" packages/ apps/` returns zero hits.
- Selection-branch behavior is validated by the tests added in Phase 07.

## Notes

- The options bag is MANDATORY. There is no zero-arg or positional form.
  This keeps the registrar explicit at the composition root and avoids
  hidden `process.env` reads inside the package.
- `environment` is supplied by the composition root from
  `RAILWAY_ENVIRONMENT` (or equivalent); the package never reads env
  directly.
- `service` is a compile-time constant per app (e.g. `"api"`, `"web"`,
  `"website"`, `"desktop"`, `"mobile"`).
- The `$environment` / `$service` reserved super-props are stamped by
  `PostHogAnalyticsTrackerImpl` from its ctor — the registrar's only
  job here is to pass them through.
- `RequestAnalyticsTrackerImpl` is registered `scoped` so each inbound
  HTTP request gets its own child container / scoped resolution. The
  actual per-request scope creation is Phase 2 work.

## Execution log

**Done:**

- `packages/analytics/src/dependency-injection/registerAnalyticsDI.ts` created with the options-bag
  signature and 4-branch selection (testing → NoOp, `enabled=false` → NoOp, missing `apiKey` → NoOp
  + `logger.warn`, else → PostHog).
- Global tracker registered as `asClass(...).singleton()` under `dependencyKeys.global.ANALYTICS`;
  `RequestAnalyticsTrackerImpl` registered `scoped` under
  `dependencyKeys.request.REQUEST_ANALYTICS`.
- Legacy `registerAnalyticsClientDI.ts` deleted. Legacy `DISABLE_POSTHOG_OTLP` branch removed from
  `packages/logging/infrastructure/logger.ts`.
- Exported `registerAnalyticsDI` from `packages/analytics/src/index.ts`. Workspace deps on
  `@t/config` and `@t/dependency-injection` added to `packages/analytics/package.json`;
  `src/dependency-injection` removed from analytics `tsconfig.json` exclude.

**Deviations from plan:**

- Plan assumed an existing `dependencyKeys` definition site. None existed. Created a new
  foundational package `@t/dependency-injection` at `packages/dependency-injection/src/{index.ts,
  entities/dependencyKeys.ts, infrastructure/container.ts}` exposing `dependencyKeys` (including
  `global.{CONFIG, LOGGER_FACTORY, ANALYTICS}` and `request.REQUEST_ANALYTICS`), Awilix re-exports,
  and a `lifetimeConfig` constant bag.
- `registerConfigRepoDI.ts` and `registerLoggerFactoryDI.ts` rewritten to import from
  `@t/dependency-injection` (the non-existent `@/di` alias they used is dead).
- Residual `@/logging` imports in `otlpTransport.ts`, `errorHandler.ts`,
  `logErrorAtAppropriateLevel.ts` fixed to `@t/logging`.
- `ConfigRepository` gained an `analytics` field (interface + impl + `ConfigValuesSchema`) backed by
  `AnalyticsConfigSchema` / `resolveAnalyticsConfig`. `posthog` field kept as-is — no migration this
  phase.
- Root `tsconfig.base.json` `paths` extended to `["./packages/*/src", "./packages/*"]` so both
  src-level and root-level packages resolve.

**Known residuals (NOT in phase scope):**

- `packages/logging/infrastructure/logger.ts:9` still imports `resolvers` from `@/di` — dead alias,
  pre-existing.
- `packages/errors/delivery/errorHandler.ts:1` same `resolvers` from `@/di` import — dead alias,
  pre-existing.
  Both are carried forward for a dedicated cleanup pass; they do not gate Phase 06 behavior.
