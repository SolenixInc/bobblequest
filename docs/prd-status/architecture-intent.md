---
name: architecture intent snapshot
last_audited: 2026-04-26 (redis railway.toml pass)
maintainer_contract: any agent editing docs/architecture/** MUST refresh this file
---

# Architecture intent — extracted from docs/architecture

## Changelog

- **2026-04-26 — @t/cache raised ✅; all packages/cache checklist items ticked.** All nine
  `packages/cache` checklist items now complete: port, schemas, Redis + in-memory impls, DI
  registrar, RedisConfigSchema, rateLimit helper, withCacheLock helper, and integration tests.
  Railway.toml redis service already declared (prior changelog entry). Checklist updated from all `[
  ]` to all `[x]`.

- **2026-04-26 — redis service declared in railway.toml.** `[redis]` service block added
  (`bitnami/redis:7.4`, AOF persistence, volume mount path, `ALLOW_EMPTY_PASSWORD=no`). `[api.env]`
  block added with `REDIS_URL` referencing `redis.REDIS_URL` via Railway inter-service template
  syntax. Monorepo & Delivery checkbox "Add self-hosted redis service to railway.toml" ticked.
  Actual provisioning (runtime service creation, sealed `REDIS_PASSWORD`, volume attachment) remains
  pending under Infra on Railway.
- **2026-04-26 — logging impl description corrected: winston (was: pino).** Module index
  `@t/logging` bootstrap impl column updated from "pino / @logtape" to "winston v3 structured JSON +
  PostHog OTLP transport". `docs/architecture/platform/logging.md` rewritten to match actual winston
  implementation.
- **2026-04-26 — drift reconciliation pass.** Items closed: (1) module index `platform/db.md` link
  corrected to `platform/database.md`; (2) per-module docs section updated — `database.md` confirmed
  present, `errors.md` added to list, 9 total docs now enumerated; (3) Vitest adoption checkbox
  flipped `[x]` (commit 62e1b20); (4) `bunfig.toml` `[test]` retirement flipped `[x]` (root
  bunfig.toml retains `[install]` only); (5) `GCPConfigSchema` drop flipped `[x]` (deleted
  2026-04-26); (6) `LoggingConfigSchema`/`AnalyticsConfigSchema`/`BillingConfigSchema` item resolved
  — logging and analytics schemas landed, billing covered by existing schemas; (7) Drift section
  rewritten — all resolved items closed, one open item (ARCHITECTURE.md checklist lag) forwarded to
  gaps.md.

## Module index (verbatim from ARCHITECTURE.md)

| Module | Port | Bootstrap impl | Zoom-in doc |
| --- | --- | --- | --- |
| `@t/dependency-injection` | — (foundation) | Awilix container + `dependencyKeys` + `lifetimeConfig` — imported by every `register*DI` | [platform/dependency-injection.md](../architecture/platform/dependency-injection.md) |
| `@t/config` | `ConfigRepository` | `process.env` + Zod per subsystem | [platform/config.md](../architecture/platform/config.md) |
| `@t/logging` | `Logger` | winston v3 structured JSON + PostHog OTLP transport | [platform/logging.md](../architecture/platform/logging.md) |
| `@t/auth` | `AuthRepository` | Clerk (`@clerk/backend` JWKS verify + webhook user sync) | [platform/auth.md](../architecture/platform/auth.md) |
| `@t/db` | `DbClient` | Railway Postgres + pgvector | [platform/database.md](../architecture/platform/database.md) |
| `@t/analytics` | `AnalyticsTracker` | PostHog (Node SDK + client SDKs) | [platform/analytics.md](../architecture/platform/analytics.md) |
| `@t/billing` | `BillingRepository` | RevenueCat primary (all apps) · Stripe as web payment processor configured inside RevenueCat | [platform/billing.md](../architecture/platform/billing.md) |
| `@t/cache` | `CacheClient` | `ioredis` against self-hosted Redis | [platform/cache.md](../architecture/platform/cache.md) |

## App index (verbatim)

| App | Stack | Role | Zoom-in doc |
| --- | --- | --- | --- |
| `apps/website` | Next.js 15 · MDX · Tailwind v4 · Shadcn/ui | Marketing + blog, no auth | [apps/website.md](../architecture/apps/website.md) |
| `apps/web` | Next.js 15 · RSC + tRPC · Tailwind v4 · Shadcn/ui | Product UI, Clerk auth (`@clerk/nextjs`) | [apps/web.md](../architecture/apps/web.md) |
| `apps/mobile` | Expo SDK 54 · NativeWind v4 (Tailwind v3) · tRPC | iOS + Android, Clerk auth (`@clerk/clerk-expo`) | [apps/mobile.md](../architecture/apps/mobile.md) |
| `apps/desktop` | electron-vite · React + TS · tRPC | macOS + Windows, Clerk auth (`@clerk/clerk-js`) | [apps/desktop.md](../architecture/apps/desktop.md) |
| `apps/api` | Bun · Hono · tRPC · Zod | HTTP entry + composition root | [apps/api.md](../architecture/apps/api.md) |

## Long-term progress checklist (verbatim, preserving checkbox state)

### Monorepo & Delivery

- [x] Bun workspaces + Turborepo wired
- [x] Biome configured
- [x] Changesets configured
- [x] `railway.toml` declares `api` / `web` / `website`
- [x] GitHub Actions CI (lint + test on PRs)
- [x] Vitest adopted as the single test runner across every workspace
- [x] Retire `apps/api/bunfig.toml` `[test]` preload in favour of Vitest `setupFiles` (root
  `bunfig.toml` retains `[install]` block; `[test]` block stripped)
- [ ] Add `postgres` service to `railway.toml`
- [x] Add self-hosted `redis` service to `railway.toml`
- [ ] Add worker service(s) for queue consumers
- [ ] GitHub Actions → Railway deploy per service (per-env)
- [ ] Preview environment per PR
- [ ] Turborepo remote cache enabled
- [x] `docs/architecture/ARCHITECTURE.md` kept in sync with reality

### `packages/config`

- [x] `entities/ports/ConfigRepository.ts`
- [x] `entities/schemas/*` (system, auth, posthog, analytics, stripe, revenueCat, apple, android,
  logging, redis, db — gcp removed)
- [x] `infrastructure/ConfigRepositoryImpl.ts`
- [x] `dependency-injection/registerConfigRepoDI.ts`
- [x] Drop `Auth0ConfigSchema` (Clerk migration)
- [x] Drop `GCPConfigSchema` (deleted 2026-04-26); `RailwayConfigSchema` not added — `databaseUrl`
  is on `DbConfigSchema`; no wrapper needed
- [x] `LoggingConfigSchema` landed; `AnalyticsConfigSchema` — covered by `AnalyticsConfigSchema.ts`;
  `BillingConfigSchema` — not added (covered by `RevenueCatConfigSchema` + `StripeConfigSchema`)
- [x] Unit tests for each schema — 116 tests, 100% coverage (2026-04-25/26)
- [x] Doc: `docs/architecture/platform/config.md`

### `packages/logging`

- [x] `entities/ports/Logger.ts`
- [x] `entities/schemas/LogLevelSchema.ts`
- [x] `infrastructure/winstonLogger.ts` (+ `globalLogger.ts`, `requestLogger.ts` discriminators)
- [ ] `infrastructure/InMemoryLoggerImpl.ts`
- [x] `dependency-injection/registerLoggerDI.ts`
- [x] Unit tests
- [ ] Wired in `apps/api` composition root

### `packages/db`

- [x] `entities/ports/DbClient.ts`
- [x] `entities/schemas/` for input DTOs
- [x] `infrastructure/PostgresClientImpl.ts`
- [x] `infrastructure/VectorQueryImpl.ts`
- [x] `dependency-injection/registerDbDI.ts`
- [ ] Migration tool chosen + first migration applied
- [ ] Integration tests against ephemeral Railway Postgres
- [x] Repositories scaffold under `packages/db/src/repositories/`

### `packages/auth` (Clerk-backed)

- [x] `entities/ports/AuthRepository.ts`
- [x] `entities/schemas/AuthUserSchema.ts`, `SessionClaimsSchema.ts`, `WebhookEventSchema.ts`
- [x] `infrastructure/ClerkAuthRepository.ts`
- [x] `infrastructure/InMemoryAuthRepository.ts`
- [x] `dependency-injection/registerAuthDI.ts`
- [x] `apps/web` wired via `@clerk/nextjs`
- [ ] `apps/mobile` wired via `@clerk/clerk-expo`
- [ ] `apps/desktop` wired via `@clerk/clerk-js`
- [x] `apps/api` middleware verifies Bearer JWT via `AuthRepository.currentUser`
- [x] `apps/api` `POST /api/webhooks/clerk` route
- [x] `packages/db` migration adds `users.clerk_user_id` unique column

### `packages/analytics`

- [x] `entities/ports/AnalyticsTracker.ts`
- [x] `entities/schemas/EventSchema.ts`
- [x] `infrastructure/PostHogTrackerImpl.ts`
- [x] `infrastructure/NoopTrackerImpl.ts`
- [x] `dependency-injection/registerAnalyticsDI.ts`
- [ ] Privacy: PII scrub at the port layer
- [ ] Browser bundle kept small

### `packages/cache`

- [x] `entities/ports/CacheClient.ts`
- [x] `entities/schemas/CacheKeySchema.ts`
- [x] `infrastructure/RedisCacheImpl.ts`
- [x] `infrastructure/InMemoryCacheImpl.ts`
- [x] `dependency-injection/registerCacheDI.ts`
- [x] `RedisConfigSchema` added to `@t/config`
- [x] Rate-limit helper built on `INCR` + `EXPIRE` (`src/helpers/rateLimit.ts`, 100% coverage)
- [x] Distributed lock helper exposed via `withLock` (`src/helpers/withCacheLock.ts`, 100% coverage)
- [x] Integration tests against ephemeral Redis container
  (`tests/integration/RedisCacheImpl.live.test.ts` + `docker-compose.cache.yml`)

### `packages/billing`

- [x] `entities/ports/BillingRepository.ts` (RevenueCat-shaped: entitlements + webhook)
- [x] `entities/schemas/` (subscription, entitlement, webhook events)
- [x] `infrastructure/RevenueCatBillingImpl.ts` — primary impl
- [ ] Stripe configured as web payment rail inside RevenueCat; scaffold-era `StripeBillingImpl` /
  `CompositeBillingImpl` retired or collapsed behind RevenueCat
- [x] `dependency-injection/registerBillingDI.ts`
- [x] `POST /api/webhooks/revenuecat` in `apps/api` with signature verification (single billing
  webhook)
- [ ] Idempotency tests

### `apps/api`

- [x] tRPC + Hono scaffold
- [x] `/health` endpoint
- [x] Router tests scaffolded
- [ ] DI container bootstraps all six modules
- [ ] Each router procedure depends only on ports
- [ ] Queue consumer entrypoint
- [ ] Cron entrypoint
- [ ] Pub/Sub publisher helpers
- [ ] OpenAPI emitted from tRPC
- [ ] Playwright smoke against production

### `apps/web`

- [x] Next.js 15 App Router + RSC
- [x] Tailwind v4 + Shadcn/ui
- [x] tRPC client wired
- [x] Playwright scaffold
- [x] `@clerk/nextjs` wired
- [ ] Auth UI backed by `@t/auth` port
- [ ] Analytics wrapper using `@t/analytics` port
- [ ] Error boundary → `@t/logging`
- [ ] Playwright e2e covers login / dashboard / paywall (RevenueCat Web SDK)

### `apps/website`

- [x] Next.js 15 + MDX
- [ ] Blog index / tag routes
- [ ] `/api/health` hooked into Railway healthcheck
- [ ] SEO: sitemap, robots, OG images
- [ ] Analytics port wired

### `apps/mobile`

- [x] Expo SDK 54 + NativeWind v4
- [x] `@clerk/clerk-expo` wired *(2026-04-26 — `<ClerkProvider>` + `tokenCache` (expo-secure-store)
  in `_layout.tsx`; `useAuth()` session gate; tRPC `httpBatchLink` attaches `Authorization: Bearer
  ${await getToken()}`)*
- [x] Native Sign in with Apple *(2026-04-26 — `useSignInWithApple` hook via
  `expo-apple-authentication` + Clerk Apple strategy)*
- [ ] Native Sign in with Google
- [ ] Auth flow wired to `@t/auth` port
- [ ] Deep links for Clerk OAuth return + billing return URLs
- [ ] Push notifications via Expo + queue consumer
- [ ] OTA updates via EAS
- [ ] Store submission pipelines

### `apps/desktop`

- [x] `electron-vite` + React
- [ ] `@clerk/clerk-js` wired in renderer
- [ ] Auto-update channel
- [ ] Code-signing (macOS + Windows)
- [ ] Crash reporter → `@t/logging`

### Infra on Railway

- [ ] Postgres service provisioned with `pgvector` enabled
- [ ] Redis service provisioned
- [ ] Pub/Sub topics declared per domain event
- [ ] Queue names declared per job type
- [ ] Cron jobs declared in `railway.toml`
- [ ] Storage bucket + signed-URL helper
- [ ] Per-environment secrets (development / production; staging removed from env model 2026-04-26)

### Legal

- [ ] Privacy policy / ToS
- [ ] Cookie consent banner
- [ ] GDPR / data-residency plan per market

### Future Platform Extraction

- [ ] Once two projects share impls, extract abstract classes + bootstrap impls into
  `@nutraforge/platform`
- [ ] App code keeps importing the port; only DI registration line changes

## Per-module docs present

- docs/architecture/platform/dependency-injection.md — yes (created 2026-04-26)
- docs/architecture/platform/config.md — yes
- docs/architecture/platform/logging.md — yes
- docs/architecture/platform/auth.md — yes
- docs/architecture/platform/database.md — yes (file is `database.md`, not `db.md` — module index
  link corrected 2026-04-26)
- docs/architecture/platform/analytics.md — yes
- docs/architecture/platform/billing.md — yes
- docs/architecture/platform/cache.md — yes
- docs/architecture/platform/errors.md — yes

## Per-app docs present

- docs/architecture/apps/api.md — yes
- docs/architecture/apps/web.md — yes
- docs/architecture/apps/website.md — yes
- docs/architecture/apps/mobile.md — yes
- docs/architecture/apps/desktop.md — yes

## Drift noted

- [RESOLVED 2026-04-26] Module index linked to `platform/db.md`; actual file is
  `platform/database.md` — link corrected above
- [RESOLVED 2026-04-26] All 9 platform docs now exist: analytics, auth, billing, cache, config,
  database, dependency-injection, errors, logging
- [RESOLVED 2026-04-26] `GCPConfigSchema.ts` deleted; `Auth0ConfigSchema` removed (Clerk migration
  2026-04-24); checklist updated above
- [RESOLVED 2026-04-26] Vitest adoption and `bunfig.toml` `[test]` retirement both landed (commit
  62e1b20, 2026-04-25); checklist updated above
- [OPEN] `ARCHITECTURE.md` checklist lags packages/{analytics, auth, cache, billing, logging} —
  scaffolding has landed but boxes remain unchecked; tracked in gaps.md documentation drift log
