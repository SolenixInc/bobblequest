---
paths:
  - "apps/**/src/index.ts"
  - "apps/**/src/composition.ts"
  - "apps/**/src/trpc/context.ts"
---

# Composition root pattern (per app)

- Pattern: every `apps/<app>` exports `buildContainer(): Container` from `src/composition.ts`. `src/index.ts` calls it once at boot. `src/trpc/context.ts` (or platform equivalent) reads ports off the container — never instantiates them.
- Reference impl: `apps/api/src/composition.ts`. Read it before wiring a new app.
- Registrar order (strict):
  1. `registerConfigRepo(container)` — must be first; everything else reads from it.
  2. `registerLoggerFactoryDI(container)` then `registerLoggerDI(container, { context })` — factory before instance.
  3. Infra: `registerCacheDI`, `registerDbDI`, `registerAuthDI`, `registerAnalyticsDI` — each takes `{ config, environment }`.
  4. `registerBillingDI(container, { stripeConfig, revenuecatConfig, revenuecatWebhookAuthHeader })` — guard with try/catch; scaffold must not hard-crash when consumer billing env vars are absent.
- Environment: pulled from `config.system?.environment` (default `'development'`). `'testing'` triggers soft-fail / in-memory bindings in DB / cache / auth / analytics registrars.
- Tokens (10 in `dependencyKeys.global`): `CONFIG`, `LOGGER_FACTORY`, `LOGGER`, `CACHE`, `DB`, `USER_REPOSITORY`, `EMBEDDING_STORE`, `AUTH`, `ANALYTICS`, `BILLING_REPOSITORY`. Note: `DB` intentionally not registered under `environment === 'testing'`; procedures use `USER_REPOSITORY` / `EMBEDDING_STORE` instead.
- Test: every app needs `src/composition.test.ts` (vitest) asserting each `dependencyKeys.global` token resolves under `ENVIRONMENT=testing` — except `DB`, which must throw on resolve in testing (by design).
- Forbidden:
  - Reading `process.env` outside `@t/config` (no exceptions — `REVENUECAT_WEBHOOK_AUTH_HEADER` is now on `RevenueCatConfigSchema.webhookAuthHeader` as of 2026-04-26; consume via `config.revenueCat.webhookAuthHeader`).
  - Instantiating ports (db / cache / auth / logger / analytics / billing) directly in `trpc/context.ts` or routers.
  - Top-level singletons in app code — every singleton must come through the container.
  - `bun:test` imports / `bun test` invocations — runner is vitest only (see `testing-runner.md`).

Reason: Single composition root keeps wiring testable, env-driven, and identical across api / web / mobile / desktop. Drift here breaks the scaffold's "consumer wires their own env vars" contract.
