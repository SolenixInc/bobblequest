---
name: bootstrap gaps & blockers
last_audited: 2026-04-30
last_updated: 2026-04-30
maintainer_contract: close items here by marking [x] and adding the commit/PR; add newly discovered gaps inline. Do NOT delete closed items; they are the audit trail.
---

# Bootstrap Gaps — Prioritized

## Changelog

- **2026-04-30 — apps/desktop coverage push to 100/100/100/100.** Vitest + jsdom + RTL suite now
  covers main process (`composition`, `index`), preload IPC bridge, and the full renderer
  (`App`, `AuthFlow`, `ErrorBoundary`, `Dashboard`, `Login`, `bootstrap`, `Welcome`, `Paywall`,
  `DesktopBillingProvider`, `clerk`, `clientConfig`, `providers`, `trpc`). Closing commit removed
  one dead guard in `Paywall.tsx`. apps/desktop Tests cell flipped 🟡 → ✅ in matrix.md;
  `vitest.config.ts` thresholds flip 0 → 100 in Track D (in flight, separate commit). Playwright
  `_electron` harness still pending under P2.

- **2026-04-28 — Documentation scaffolding shipped (~60 files, 8 tracks).**
  Full Diátaxis doc surface added to the repo. The initiative covered eight tracks committed
  across SHAs 327b899..fc08dcf (see git history for the full file inventory):
  - Track 1 — Governance + CI: NOTICE, SECURITY, CONTRIBUTING, ONBOARDING, .markdownlint.jsonc,
    .markdownlintignore, lychee.toml, PR template polish, `.github/workflows/markdownlint.yml`,
    `link-check.yml`.
  - Track 2 — Diátaxis hub + tutorials: `docs/index`, `docs/README` rewrite, `docs/onboarding`,
    glossary, secrets policy, `tutorials/` (00-template + getting-started + add-a-trpc-procedure).
  - Track 3 — Reference quadrant: 00-template, env-vars, tRPC-api, database-schema, scripts,
    ports-and-services.
  - Track 4 — How-to quadrant: 00-template, add-a-route, add-a-platform-package, run-a-migration,
    rotate-a-secret, cut-a-release.
  - Track 5 — Operations quadrants: runbooks (00 + database-down + clerk-outage + posthog-loss +
    railway-deploy-stuck), postmortems (00 + example), infra (00 + Railway map),
    `operations/release-process`.
  - Track 6 — Explanation + ADR migration: explanation (00 + architecture-overview);
    `docs/architecture/decisions/` → `docs/adr/` (MADR conventions, renumbered 000/001/002);
    new ADRs 003 Bun+Turbo, 004 Drizzle, 005 RevenueCat, 006 tRPC, 007 prd-status governance,
    008 Conventional Commits + release-please.
  - Track 7 — Compliance skeleton: README + AUDIT-LOG stubs + soc2 + hipaa + iso27001 +
    gdpr-ccpa.
  - Track 8 — Root polish + drift cleanup: `current_state.md` redirect; `verification.md` →
    `docs/operations/`; `STATUS_TRACKING.md` role clarified; `prd-status/README.md` table
    added; ADR index status fixed.
  - **Deferred follow-ups:**
    - `docs/reference/env-vars.md` — currently hand-authored stub; should be codegen from
      `@t/config` Zod schemas. No tooling shipped yet.
    - `docs/reference/trpc-api.md` — stub; should be generated from the AppRouter type or an
      OpenAPI export once the api ships `emit-openapi` (tracked in P2 apps/api open item).
    - lefthook pre-commit scope (stage-only filtering) already addressed in `f6a0322`; no
      further action.
    - GitHub Actions `issues: write` permission gap on `release.yml` — release-please needs
      write permission to open the release PR; verify `permissions:` block covers `pull-requests:
      write` and `contents: write` in `.github/workflows/release.yml`.
  - prd-status governance formalized in ADR 007 (`b5a5b99`, `d0f02d8`).

- **2026-04-28 — TS5097 lint blocker verified phantom.** Verified phantom — typecheck green across
  22 packages on 2026-04-28; no TS5097 errors surfacing in `@t/analytics`, `@t/auth`, or
  `@t/logging`. `allowImportingTsExtensions` is intentional and works.

- **2026-04-27 — Desktop error handling complete.** `process.on('uncaughtException' |
  'unhandledRejection')` added to main process (logged via `@t/logging` DI); React `ErrorBoundary`
  added to renderer wrapping the app root. `apps/desktop/src/renderer/components/ErrorBoundary.tsx`
  provides a Tailwind-styled fallback UI and console logging for renderer crashes. Closes the P2
  "error boundaries or global error handling" gap for desktop.

- **2026-04-27 — Mobile bootstrap wiring complete.**
 `@t/config` (via `MobileConfigValuesSchema`), `@t/logging-rn`, `@t/analytics-rn` (PostHog RN), and
 global Error Boundary (`app/+error.tsx`) all wired in `apps/mobile`. `src/lib/composition.ts`
 manages the DI container. Config variables `EXPO_PUBLIC_*` are now validated and consumed through
 the container. Error boundary captures exceptions to PostHog.

- **2026-04-27 — /health and /bootstrap probes enhanced in apps/api.** `/health` endpoint now
  performs parallel liveness pings for Postgres and Redis, returning 503 if either fails.
  `/bootstrap` richer probe also updated to include a Redis liveness ping alongside existing DB and
  DI checks. Closes the P2 "Extend /health to probe Postgres + Redis" gap.

- **2026-04-27 — Project domain implemented and routers ported.** `ProjectRepository` port +
  Drizzle/In-Memory impls added to `@t/db`; `projects` table + `projectStatusEnum` schema landed;
  `db:generate` run producing `0001_magenta_omega_red.sql` migration; `auth.ts`, `users.ts`, and
  `projects.ts` routers in `apps/api` now fully ported onto `userRepository` and `projectRepository`
  in tRPC context. Closes the P2 "Port routers onto ctx.db" gap.

- **2026-04-27 — CORS origins and port moved to ConfigRepository in apps/api.** `SystemConfigSchema`
  updated with `corsOrigins` (defaulting to localhost:3000/8081). `ConfigRepositoryImpl` reads
  `CORS_ORIGINS` (comma-separated) and `PORT` env vars. `apps/api/src/index.ts` now resolves
  `CONFIG` from DI to set CORS and listen port. 100% test coverage in `@t/config` maintained with
  new test cases.

- **2026-04-27 — Postgres service container wired in railway.toml + CI.** `DATABASE_URL` added to
  `[api.env]` in `railway.toml`. Postgres service container (`pgvector/pgvector:pg17`) added to CI
  `test` and `drizzle-check` jobs, enabling `@t/db` integration tests in CI.

- **2026-04-27 — RevenueCat-everywhere billing wiring complete across all three client apps.**
  RevenueCat is now the sole billing UI layer on every platform; Stripe is server-only behind
  `CompositeBillingImpl` in `@t/billing` and is not exposed as a client SDK anywhere.
  - **apps/web** (commit `5ec3157`): `/pricing` paywall route wired consuming `@t/billing-browser`
    (RevenueCat Web SDK wrapper). `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY` in `.env.example`;
    consuming projects supply the real key.
  - **apps/mobile** (commit `5ec3157`): `react-native-purchases` + `react-native-purchases-ui`
    installed; Expo plugin registered in `app.json`; `RevenueCatProvider` added to
    `src/lib/providers.tsx`; paywall screen in `(billing)/` stack.
    `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` + `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` in `.env.example`.
  - **apps/desktop** (`feat(desktop): wire RC Web SDK + paywall in renderer`):
    `DesktopBillingProvider` + `Paywall` component added to the Electron renderer; initialised via
    `VITE_REVENUECAT_PUBLIC_API_KEY`. Chromium-based renderer reuses the same
    `@revenuecat/purchases-js` Web SDK pattern as `@t/billing-browser`, with `VITE_*` prefix instead
    of `NEXT_PUBLIC_*`.
  - `@t/billing` package progress 🟡 65% → 🟡 80%. Billing matrix cells for apps/web, apps/mobile,
    apps/desktop all flipped to ✅.
  - P2 items closed: `Install react-native-purchases` (mobile), `Wire RevenueCat Web SDK` (desktop).

- **2026-04-26 — @t/cache raised to ✅ done.** All package gaps closed: `rateLimit` helper
  (`src/helpers/rateLimit.ts`, fixed-window INCR+EXPIRE, 100% coverage), `withCacheLock` helper
  (`src/helpers/withCacheLock.ts`, named wrapper over `withLock`, 100% coverage), integration test
  infra (`vitest.integration.config.ts`, `tests/integration/setup.ts`,
  `tests/integration/RedisCacheImpl.live.test.ts`, `docker-compose.cache.yml` on port 6380,
  `test:integration` script in `package.json`), `railway.toml` `[redis]` service block declared
  (bitnami/redis:7.4, AOF, volume, `REDIS_URL` in `[api.env]`), apps/api composition root wired
  (`registerCacheDI` in correct order; `composition.test.ts` strengthened to 135 tests at 100%
  coverage). Matrix pkg cell flipped 🟡 → ✅. Remaining deferred item: GitHub Actions CI service
  container for Redis integration tests.

- **2026-04-26 — six-commit batch landed (config + logging-browser + cache integration + CI
  size-limit + website artifact ignore + apps/website 100% doc).** Consolidated entry covering:
  - `0c0532c` chore(website): add `apps/website/.gitignore` covering `e2e/screenshots/`,
    `playwright-report/`, `test-results/`; previously-tracked artifacts removed from index.
  - `7f6a729` docs(prd-status): apps/website flipped to ✅ 100% in `matrix.md`; `apps/website.md`
    entry-points/wiring/gap sections fully refreshed for Shadcn + composition root + DI + MDX
    collection + error boundaries + PostHog.
  - `d52181f` test(cache): live integration tests landed — `vitest.integration.config.ts`,
    `tests/integration/{setup.ts,RedisCacheImpl.live.test.ts}`, `docker-compose.cache.yml`
    (bitnami/redis:7.4 on port 6380), `test:integration` script, README integration-tests section.
    Closes the `@t/cache` integration-test gap.
  - `6cd7c69` feat(logging-browser): `@t/logging-browser` package shipped — `ConsoleLogger` +
    `AnalyticsBridgedLogger` decorator + verbatim-ported `redactors`/`errorSerializer` +
    `createBrowserLogger` factory + `registerLoggerBrowserDI` + 100% coverage. Closes the
    browser-logging-adapter gap. Same commit also adds `WebConfigValuesSchema`
    (`packages/config/entities/schemas/WebConfigValuesSchema.ts`) exposing `client: { trpcUrl }`
    from `NEXT_PUBLIC_TRPC_URL`.
  - `4212643` feat(ci): size-limit v12 shipped — apps/web `.next/static/**/*.js` ≤ 1800 kB; apps/api
    `dist/index.js` ≤ 4600 kB; new `size-limit` job in `.github/workflows/ci.yml`. Closes the CI
    bundle-size budget gap.
  - `f518fe1` feat(config,web): `apps/web` now routes `NEXT_PUBLIC_TRPC_URL` through
    `WebConfigValuesSchema` from `@t/config` (closes the apps/web client-side `@t/config` gap). Same
    commit also adds the analytics-browser surface (`PostHogBrowserAnalyticsTracker`,
    `AnalyticsProvider`, hooks, README) and `@t/logging-browser` `errorSerializer`/`redactors` test
    files (100% coverage).

- **2026-04-26 — CI bundle-size budget (size-limit v12) shipped for apps/web + apps/api.** Root
  `package.json` adds devDeps `size-limit ^12.1.0`, `@size-limit/preset-app ^12.0.0`,
  `@size-limit/file ^12.1.0`. `apps/web/package.json` adds `"size"` script + `"size-limit"` field —
  budget **1800 kB** on `.next/static/**/*.js` (baseline 1506 kB + 20% headroom; brotli measured at
  399 kB). `apps/api/package.json` adds `"size"` script + `"size-limit"` field — budget **4600 kB**
  on `dist/index.js` (baseline 3762 kB + 20%; brotli 517 kB). New `size-limit` job in
  `.github/workflows/ci.yml` depends on `[setup, build]`, turbo-filtered to apps/web, apps/api,
  packages/. Sequential web build → web check → api build → api check. Matches existing job style
  (`checkout@v6.0.2`, `setup-bun@v2.2.0`, frozen-lockfile, turbo cache, `timeout-minutes: 15`).
  Local `bunx size-limit` PASS for both apps. Commit `4212643`. **Known follow-up (not addressed in
  this turn):** the in-flight `packages/config/infrastructure/ConfigRepositoryImpl.ts` change
  introduces a `node:process` URI scheme webpack error that breaks the apps/web build — the new
  `size-limit` web step will fail on any PR that includes that uncommitted change until the
  in-flight config refactor lands. Tracked under P1 below.

- **2026-04-26 — `@t/logging` SIGTERM/SIGINT flush hook shipped in apps/api; package raised 🟢 → ✅.**
  `apps/api/src/lifecycle.ts` registers SIGTERM and SIGINT handlers that `await shutdownLogging()`
  before `process.exit(0)`; the helper awaits `OTLPWinstonTransport.shutdown()` so buffered PostHog
  logs flush on graceful termination. Closes the apps/api SIGTERM gap. `@t/logging` consumer wiring
  is now complete on apps/api; remaining package open items (`apps/{website,mobile,desktop}`
  composition roots, browser/RN adapter) are cross-app and tracked under those apps. Commit:
  `docs(prd-status): close @t/logging SIGTERM gap; mark package complete` (paired with `feat(api):
  graceful SIGTERM/SIGINT flush via shutdownLogging`).
- **2026-04-26 — `@t/billing` eager DI registration shipped; P1 lazy-registrar gap closed.**
  `registerBillingDI` switched from `asFunction` to `asValue`: `RevenueCatBillingImpl` /
  `StripeBillingImpl` / `CompositeBillingImpl` constructors now run at registration time, so
  RevenueCat + Stripe config validation surfaces at app boot and is caught by the composition-root
  `try/catch` in `apps/api/src/composition.ts#buildContainer()`. Closes the P1 "registerBillingDI is
  lazy" entry. apps/api Billing cell remains ✅ but is no longer "lazy" — `matrix.md` updated.
  `@t/billing` package progress 🟡 55% → 🟡 65%.

- **2026-04-26 — apps/website Shadcn primitives installed; `@types/react` pinned for build compat.**
  Shadcn/ui components installed via CLI: button, card, badge, nav-menu, separator
  (`components.json` + full token set + `cn()` helper all present). `@types/react` pinned to 19.0.12
  via root `package.json` overrides to resolve version conflict between Next.js and Shadcn
  transitive deps. apps/website P2 gaps updated: Shadcn item closed; `@types/react` tracking item
  added. App status remains ✅ 100% in matrix.

- **2026-04-26 — apps/website complete; scaffold flipped from 🟠 17% → ✅ 100%.** Filesystem-driven
  MDX content collection shipped at `src/content/collection.ts` (gray-matter + Zod frontmatter
  validation, sorted by date desc). Three sample posts with required frontmatter `{title, date,
  description, tags?, author?}`. MDX pipeline: remark-gfm + rehype-pretty-code (shiki
  github-dark-dimmed). Server-side composition root at `src/lib/composition.ts` (memoized, CONFIG +
  LOGGER via @t/config + @t/logging). `WebsiteConfigSchema` added to `packages/config` (SITE_URL:
  url, posthog?: {apiKey, host?, enabled}). Shadcn/ui: `components.json` + full token set in
  `globals.css` (matches apps/web). PostHog browser SDK: `instrumentation-client.ts` (one-time init)
  + `<PHProvider>` + `<PostHogPageView />` in `layout.tsx` (SPA pageviews via `usePathname` +
  `useSearchParams`). Error boundaries: `error.tsx` + `global-error.tsx` + `not-found.tsx` (all call
  `posthog.captureException`). SEO: per-page metadata, JSON-LD BlogPosting, OG images via `next/og`,
  title template "%s · Template Site". Tests: Vitest 10/10 (collection + composition), Playwright
  8/8 (home, blog, posts, 404, sitemap, health). CI: `.github/workflows/ci.yml` updated (SITE_URL
  env, e2e filter). Closed P2 items: content collection + frontmatter, Shadcn full stack, @t/config
  wiring, @t/logging server root, error boundaries + posthog-js, per-post SEO + OG, vitest +
  playwright, CI integration. Browser analytics uses `posthog-js` directly (not `@t/analytics` —
  server-only); consistent with apps/web. Healthcheck `/api/health` ready for Railway. Non-blockers:
  custom OG fonts, siteName schema, tag routes, RSS feed.

- **2026-04-26 — apps/web browser observability shipped; client analytics + error-boundary gaps
  closed.** `posthog-js@1.372.1` wired in `apps/web` via Next 15 native `instrumentation-client.ts`
  (one-time `posthog.init()`, `defaults: '2026-01-30'`, `person_profiles: 'identified_only'`,
  `capture_pageview: false`, no-ops cleanly when `NEXT_PUBLIC_POSTHOG_KEY` missing). New
  `src/app/providers/posthog-provider.tsx` (`<PHProvider>` wrapping `PostHogProvider` from
  `posthog-js/react`) and `src/app/_components/posthog-page-view.tsx` (`'use client'` SPA pageview
  via `usePathname`+`useSearchParams` + Clerk identify/reset via `useAuth`+`useUser`) mounted in
  `layout.tsx` inside `<Suspense fallback={null}>`. `src/app/error.tsx` (route-level) and
  `src/app/global-error.tsx` (root, owns `<html><body>`) both `'use client'`, both call
  `posthog.captureException(error)` in `useEffect`. `global-error.tsx` deviates from spec by
  skipping `next/error` (Pages-Router-typed); ships a minimal Tailwind fallback instead.
  `.env.example` adds `NEXT_PUBLIC_POSTHOG_KEY=` +
  `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`; `apps/web/package.json` adds
  `posthog-js@1.372.1`. Verified: `bun run typecheck` ✅, `bun run build` ✅ (5 routes, zero
  warnings). **Architectural note:** apps/web uses `posthog-js` directly, NOT via `@t/analytics` —
  `@t/analytics` is `posthog-node` (server-only) and `@t/logging` is Winston (server-only); browser
  surfaces deliberately bypass the `@t/*` server packages because the SDKs and event surfaces
  differ. Future mobile/desktop will follow the same direct-SDK pattern (`posthog-js` /
  `posthog-react-native`). Closed P2 items under apps/web: `error.tsx` / `global-error.tsx`, mount
  client-side analytics. apps/web completion 🟡 50% → 🟡 ~68%.

- **2026-04-26 — `@t/errors` consumer wiring landed in apps/api; package raised 🟡 → ✅.** Three pieces shipped together: (1) `packages/errors/delivery/errorHandler.ts` rewritten to read `requestId` / `logger` / `analytics` from Hono context (`c.get(...)`) with graceful fallback when absent (139/139 tests at 100% coverage; new `delivery/hono.d.ts` augments `ContextVariableMap`). (2) `packages/analytics` adds `RequestAnalyticsTracker.captureException(error, context?)` overload — auto-fills `distinctId` from the scoped user (falling back to `sessionId`/`requestId`); `AnalyticsTracker` keeps its 3-arg signature for process-level callers (83/83 tests at 100% coverage). (3) `apps/api` adds `src/middleware/request-context.ts` (NEW) producing `requestId` via `crypto.randomUUID()`, child logger via `createGlobalLogger({ requestId, metadata: { method, path } })`, and a per-request analytics scope via `container.createScope()` — all three written to Hono context; echoes `X-Request-ID`. `apps/api/src/lifecycle.ts` (NEW) exports `installProcessHandlers(container)` which registers `process.on('unhandledRejection' | 'uncaughtException')` and uses `AnalyticsTracker.captureException(error, 'system', { source })` (process-level events have no user context, so the explicit `'system'` distinctId is intentional). `apps/api/src/index.ts` calls `installProcessHandlers(container)` after `buildContainer()` and mounts `app.use('*', createRequestContextMiddleware(container))` after CORS, before health/webhooks/auth/tRPC. apps/api tests moved 96 → 129 (+33) at 100% coverage. **Drift reconciliation (re-verified):** Earlier 2026-04-26 changelog already closed the `Environment` enum mismatch when `EnvironmentSchema` collapsed 5→4 values; this session re-verified that both `packages/analytics/src/entities/types/Environment.ts` and `packages/config/entities/schemas/EnvironmentSchema.ts` use the same `development|local|testing|production` set, and that no `as any` cast exists in `apps/api/src/composition.ts`. Stale references removed from `apps/api.md` and `analytics.md` audit trails. Closed P2 items: `@t/errors` analytics capture wire, `RequestLogger`/`requestId` request-scope middleware, `process.on('unhandledRejection')`. Final apps/api mount order: `onError(errorHandler)` → `cors` → `request-context` → `/health` → webhooks → `clerkAuth(/trpc/*)` → tRPC.

- **2026-04-26 — `@t/logging` platform-doc reconciliation closed; package status raised 🟡 → 🟢.**
  `docs/architecture/platform/logging.md` was rewritten 2026-04-26 to describe the shipped Winston
  v3 + PostHog OTLP impl (frontmatter `last_audited: 2026-04-26`); no pino references remain in the
  platform doc. Verified `apps/api` composition root in
  `apps/api/src/composition.ts#buildContainer()` calls both `registerLoggerFactoryDI(container)` and
  `registerLoggerDI(container, { context: { requestId: 'global', metadata: { service: 'api' } } })`;
  LOGGER token resolves under test. Verified `apps/web/src/lib/composition.ts` does the same
  server-side. Package name is now `@t/logging` (rename P0 closed for this package).
  `docs/prd-status/packages/logging.md` updated: status 🟡 → 🟢; gaps section split into Closed
  (platform-doc, apps/api wiring, package rename, ARCHITECTURE.md) and Open
  (apps/{website,mobile,desktop} composition roots, browser/RN adapter, SIGTERM flush, LOGGER token
  hoist, errors-fanout). Remaining open items in this file: SIGTERM flush hook (apps/api section);
  `@t/auth` and `@t/logging` DI-token hoists (P1 DI-tokens entry).

- **2026-04-26 — `EnvironmentSchema` collapsed 5→4 values; `staging` hard-dropped.** Canonical enum is now `"development" | "local" | "testing" | "production"`. All downstream consumers updated: `packages/analytics/src/entities/types/Environment.ts`, `registerDbDI` union, `registerAuthDI` union, `@t/errors` response transformers (`isProduction` simplified to `=== 'production'` only). Tests updated: `EnvironmentSchema.test.ts` (staging rejection case added), `ConfigSchemas.test.ts`, `toAppErrorResponse.test.ts`, `toUnknownErrorResponse.test.ts`. Docs updated: `docs/architecture/platform/config.md`, `docs/prd-status/packages/config.md`, `packages/config/README.md`, `apps/web/.env.example`. The pre-existing P1 gap "`registerAnalyticsDI` Environment-enum mismatch" is closed — analytics `Environment` type now aligns with the canonical 4-value enum; no `as any` cast present in `apps/api/src/composition.ts`. Zero `staging` literals remain in production source code.

- **2026-04-26 — ARCHITECTURE.md checklist reconciled with on-disk scaffold state for @t/logging,
  @t/auth, @t/analytics, @t/cache, @t/billing.** On-disk audit confirmed all five packages have
  `entities/`, `infrastructure/`, and `dependency-injection/` directories with at least one file
  each and a `register*DI.ts`. ARCHITECTURE.md already reflected this (all scaffold items were
  `[x]`); no boxes required flipping. Documentation drift log entry closed.

- **2026-04-26 — drift reconciliation pass.** Items closed: none in this file (all previous
  changelog entries already landed). Item escalated with accurate current status: `ARCHITECTURE.md`
  checklist lag for `packages/{analytics,auth,cache,billing,logging}` — verified on disk that all
  five packages have full scaffolding (`entities/`, `infrastructure/`, `dependency-injection/`) and
  100% test coverage per 2026-04-25 pass, but `ARCHITECTURE.md` Long-Term Progress checkboxes remain
  unchecked. Gap annotation updated with verification result and accurate next action
  (ARCHITECTURE.md pass required).

- **2026-04-26 — apps/api integration shipped: clerkAuth middleware, both webhooks, errorHandler.**
  `apps/api/src/middleware/clerkAuth.ts` exports `createClerkAuthMiddleware(container)` populating
  `c.var.userId` / `c.var.user` from Bearer tokens, mounted on `/trpc/*` in `apps/api/src/index.ts`.
  tRPC context (`apps/api/src/trpc/context.ts`) consumes `c.var` (fast path) with in-context Bearer
  fallback for tests. `POST /api/webhooks/clerk` (`apps/api/src/routes/webhooks/clerk.ts`) ships
  svix signature verification (kept svix directly — not `@clerk/backend/webhooks`) + real
  `UserRepository` create / update / delete + `auth.syncFromWebhook(event)`; repo errors → 500 (svix
  retries). `POST /api/webhooks/revenuecat` (`apps/api/src/routes/webhooks/revenuecat.ts`) ships
  shared-secret verification via `verifyRevenueCatWebhook` from `@t/billing` against
  `config.revenueCat.webhookAuthHeader`, parses via `RevenueCatWebhookEventSchema`, dispatches
  `billingRepository.handleRevenueCatEvent(event)`. `app.onError(errorHandler)` mounted at
  `apps/api/src/index.ts:19` from `@t/errors`. Tests: 96/96 pass at 100% coverage in `apps/api`;
  117/117 pass in `packages/config`. Mount paths confirmed `/api/webhooks/clerk` and
  `/api/webhooks/revenuecat` (NOT shorthand `/webhooks/*`). Known follow-up tech debt (NOT fixed in
  this pass): `SessionUser` + `readBearerToken` duplicated between
  `apps/api/src/middleware/clerkAuth.ts` and `apps/api/src/trpc/context.ts` (extract to shared
  file); CORS origins still hardcoded in `index.ts`; `/health` does not yet probe Postgres + Redis.
  Closed P2 items: clerkAuth Hono middleware, /webhooks/clerk persistence, /webhooks/revenuecat,
  errorHandler mount, REVENUECAT_WEBHOOK_AUTH_HEADER schema. Routers confirmed clean of Supabase
  residue (still throw `NOT_IMPLEMENTED` pending `@t/db` domain models).

- **2026-04-26 — `@t/dependency-injection` gaps closed; package flipped to 🟢.** Platform doc
  `docs/architecture/platform/dependency-injection.md` created (was MISSING — closed). Package
  README `packages/dependency-injection/README.md` created (closed). Token snapshot test
  `packages/dependency-injection/tests/dependencyKeys.test.ts` added (closed). Composition-root gap
  for `apps/api` remains closed (landed 2026-04-25). Remaining open: `apps/web` / `apps/mobile` /
  `apps/desktop` composition roots; `REQUEST_ANALYTICS` request-scope middleware.

- **2026-04-26 — `@t/config` GCP/legacy cleanup + Railway-targeted webhook env.** `GCPConfigSchema.ts` deleted (hard delete — no shim). `gcp` removed from composite schema, port interface, impl, type exports, and all test fixtures. `mongoUri` dropped from `SystemConfigSchema`. `K_SERVICE` sentinel in `isLocal` replaced with `environment === 'local' || environment === 'development'` derivation. `RevenueCatConfigSchema.webhookAuthHeader` (z.string().min(1)) added; `ConfigRepositoryImpl` reads it from `REVENUECAT_WEBHOOK_AUTH_HEADER`; `apps/api/src/composition.ts` reads it from `config.revenueCat?.webhookAuthHeader` (no more bare `process.env`). `ConfigTypes.ts` now exports all 6 previously-missing types: `AnalyticsConfig`, `AuthConfig`, `DbConfig`, `LoggingConfig`, `RedisConfig`, `RevenueCatConfig`. Decision: no new `RailwayConfigSchema` or `BillingConfigSchema` — content is fully covered by existing `DbConfigSchema` and `RevenueCatConfigSchema` + `StripeConfigSchema`. `@t/config` 116/116 tests pass; 100%/100%/100%/100% coverage thresholds hold. `apps/api` 94/94 tests still pass.

- **2026-04-25 — 100% test coverage across packages + apps/api; CI hardened.** All `packages/*`
  reach 100% statement/branch/function/line coverage enforced via Vitest v8 thresholds.
  `packages/billing`, `packages/config`, `packages/db`, `packages/cache`, `packages/errors`,
  `packages/analytics`, `packages/auth`, `packages/logging`, `packages/dependency-injection` all at
  100%. `apps/api` moved from 32.27% → 100% coverage: new test files cover `createContext` (10
  paths), tRPC procedures (protectedProcedure/adminProcedure/errorFormatter), routers
  (auth/users/projects), and Clerk webhook handler (vi.mock('svix')). Unreachable branches guarded
  with `/* v8 ignore next */` comments. `apps/web` adds `utils.test.ts` (6 tests); coverage
  thresholds set to 0 for all Next.js/Expo/Electron apps (App Router / native components require
  full runtime). CI workflow hardened: format-check (`biome format --check`), secret scan (gitleaks
  on diff), concurrency `cancel-in-progress` on PRs, Codecov coverage upload — all landed. `test` +
  `test:coverage` scripts wired in every workspace. Silent no-op CI test job eliminated.

- **2026-04-25 — apps/web Clerk migration + @t/* server wiring landed.** `apps/web` swapped Supabase
  → Clerk: `@clerk/clerk-react ^5.61.3` removed, `@clerk/nextjs ^7.2.3` installed; `middleware.ts`
  uses `clerkMiddleware()` with App Router matcher; `layout.tsx` wraps in `<ClerkProvider>` from
  `@clerk/nextjs`; `dashboard/page.tsx` rewritten as server component using `await auth()` +
  `redirectToSignIn()`; `/sign-in/[[...sign-in]]/page.tsx` + `/sign-up/[[...sign-up]]/page.tsx`
  catch-all routes added; legacy `src/app/login/` directory and `providers.tsx` deleted;
  `lib/clerk.ts` re-exports from `@clerk/nextjs`; `lib/trpc/provider.tsx` injects `Authorization:
  Bearer ${await getToken()}` via `useAuth()` from `@clerk/nextjs`; `.env.example` lists
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`,
  `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, fallback redirects to `/dashboard`. Workspace `@t/*`
  deps wired (server-only): `@t/analytics`, `@t/config`, `@t/dependency-injection`, `@t/errors`,
  `@t/logging` added; `next.config.mjs` `transpilePackages` updated; new `src/lib/composition.ts`
  builds a server-only DI container (`config` → `loggerFactory` → `logger` → `analytics`, `service:
  'web'`); new `src/lib/logger.ts` + `src/lib/analytics.ts` server-only re-exports; `layout.tsx`
  emits a `'web boot'` log server-side. Server-only constraints noted: `@t/logging` is Winston-based
  (node only), `@t/analytics` uses `posthog-node` (server only), `@t/errors` ships only Hono
  `errorHandler` (no React `ErrorBoundary` yet) — browser-side analytics + error boundaries still
  pending and depend on `posthog-js` / a browser adapter. Playwright: `e2e/login.spec.ts` renamed →
  `home.spec.ts` with title `/Template Web App/`; new `e2e/auth-routes.spec.ts` covers `/sign-in`,
  `/sign-up`, and signed-out `/dashboard` redirect; all e2e tests guard on `CLERK_PUBLISHABLE_KEY`.
  `package.json` adds `test:e2e: playwright test` script and pins `@clerk/nextjs ^7.2.3`;
  `playwright.config.ts` `webServer` runs `next dev --port 3000`. Resolves the apps/web Clerk-swap
  entry under P2; web composition root + sign-in / sign-up catch-alls + Bearer-header injection +
  Playwright drift all closed.
- **2026-04-25 — Vitest-only stance enforced repo-wide.** `apps/api` migrated off `bun:test` to
  Vitest: `apps/api/bunfig.toml` deleted; `apps/api/vitest.config.ts` added with `setupFiles:
  ['./src/__tests__/setup.ts']`; `package.json` `"test": "vitest run"`; 12/12 passing. `@t/config`
  migrated off `bun:test` to Vitest: `vitest.config.ts` added; `package.json` `"test": "vitest
  run"`; 10/10 passing across 1 spec file. Root `bunfig.toml` `[test]` block stripped (kept
  `[install]` for bun workspace/lockfile config); orphaned root `test/setup.ts` and `test/` dir
  deleted. `@t/auth` confirmed already on Vitest (35/35 passing in 4 files — prior gap claiming `bun
  test` was incorrect). Repo standard going forward: Vitest only; no `bun:test` anywhere.
- **2026-04-25 — apps/api composition root landed.** `apps/api/src/composition.ts` now ships
  `buildContainer()` wiring all 10 DI tokens (CONFIG, LOGGER_FACTORY, ANALYTICS, CACHE, DB,
  USER_REPOSITORY, EMBEDDING_STORE, BILLING_REPOSITORY, AUTH, LOGGER) plus request-scoped
  `REQUEST_ANALYTICS`. `src/index.ts` calls `buildContainer()` once at boot and mounts `app.onError`
  with the resolved logger. `src/trpc/context.ts` accepts the container and exposes `db`, `cache`,
  `logger`, `auth`, `analytics`, `requestAnalytics` on `Context`; Clerk client now sourced from the
  resolved `auth` port. New `src/composition.test.ts` asserts every global token resolves;
  `src/__tests__/setup.ts` stubs ~20 required env vars so `ConfigRepositoryImpl` validates under
  `ENVIRONMENT=testing`. `apps/api/package.json` added workspace deps for all consumed `@t/*`
  packages plus a `test` script. `packages/config/package.json` fixed missing `"."` export and added
  `@t/dependency-injection` dep (needed by `registerConfigRepoDI`). Verification: `tsc --noEmit`
  exit 0; `bun test` 12/12 pass. Resolves the P1 "no composition root" gap for apps/api;
  web/mobile/desktop composition roots remain pending.
- **2026-04-25 — `@t/errors` package boilerplate complete.** `package.json` (name `@t/errors`, deps
  `hono`/`zod`/`@t/logging`, `exports`, scripts), `tsconfig.json`, `vitest.config.ts`, `README.md`,
  and `__tests__/` (~6 Vitest specs covering AppError invariants, response transformers, Zod
  conversion, status/log-level branches, errorHandler integration) all landed. Broken `@/errors` and
  `@/entities/errors` path aliases rewritten to relative imports across 7 source files; package now
  typechecks. Platform doc `docs/architecture/platform/errors.md` confirmed already present (prior
  gap was stale). Package downgraded from 🔴 → 🟡 partial; remaining work is consumer wiring in
  `apps/api` (errorHandler mount + analytics capture + request-scoped logger/requestId), tracked in
  P2.
- **2026-04-24 — DI tokens hoisted for cache/db/billing.** `dependencyKeys.global` now includes
  `CACHE`, `DB`, `USER_REPOSITORY`, `EMBEDDING_STORE`, `BILLING_REPOSITORY`. The local
  `*_DEPENDENCY_KEY` exports in `@t/cache`, `@t/db`, and `@t/billing` now alias the canonical
  tokens. `@t/auth` and `@t/logging` token hoists are still pending (out of scope for this pass).
  `@t/errors` has no DI surface and is intentionally skipped. Composition-root wiring in `apps/api`
  remains the blocker for every registrar.
- **2026-04-24 — `@t/logging` mid-rewrite resolved.** Package now ships a complete winston-backed
  impl: `Logger` port + `WinstonLogger` / `GlobalLogger` / `RequestLogger`, `redactors`,
  `errorSerializer`, `quietMode`, PostHog `OTLPWinstonTransport` with circuit breaker + singleton
  factory, `registerLoggerDI` + `registerLoggerFactoryDI`, 7 Vitest specs. Package is 🟡
  (self-contained Phase 1 done; app wiring + DI-token hoist + platform-doc reconciliation remain).
  Removed from P1 below.

## P0 — Product/architecture decisions that unblock everything else

- [x] **Auth provider scaffolded.** `@t/auth` ships the Clerk template scaffold (`ClerkAuthProvider`
  via `@clerk/backend` + `NoopAuthProvider` + `registerAuthDI`). `apps/web` migration to Clerk
  completed 2026-04-25. `apps/api` Clerk integration completed 2026-04-26. `apps/mobile` and
  `apps/desktop` are also confirmed to use Clerk (scaffolded with `@clerk/clerk-expo` and
  `@clerk/clerk-react` respectively, with Bearer token injection on tRPC links and no Supabase
  residue).
- [ ] **DB strategy / provider (RESOLVED at package level).** `@t/db` has been rewritten to the
  Railway Postgres + Drizzle ORM + `pgvector` target per `docs/architecture/platform/database.md`:
  `DbClient` port shipped, `DrizzleDbClientImpl` + in-memory doubles present, `registerDbDI` wired,
  `0000_enable_pgvector.sql` + `0001_init_schema.sql` migrations landed, `@supabase/supabase-js`
  removed. Migration tool: Drizzle Kit. `apps/api` composition-root wiring + first `drizzle-kit
  migrate` against a live Postgres remain.
- [x] **Package-scope naming.** Resolved 2026-04-27: Standardized on @t/* across code, package.json,
  and all documentation.

## P1 — Foundation repairs (must land before apps can wire)

- [x] **Composition root landed in apps/api (2026-04-25).**
  `apps/api/src/composition.ts#buildContainer()` instantiates the container, calls
  `registerConfigRepoDI` + `registerLoggerDI` first, then fans out to `registerAnalyticsDI`,
  `registerCacheDI`, `registerDbDI`, `registerAuthDI`, `registerBillingDI`. `src/index.ts` calls it
  once at boot; `src/trpc/context.ts` consumes resolved ports. 10 DI tokens (CONFIG, LOGGER_FACTORY,
  ANALYTICS, CACHE, DB, USER_REPOSITORY, EMBEDDING_STORE, BILLING_REPOSITORY, AUTH, LOGGER) all
  resolve under test. **Web/mobile/desktop composition roots still pending** — tracked in their
  respective P2 sections. Moved from P1 to changelog.
- [x] **`@t/errors` package boilerplate shipped (2026-04-25).** `package.json` (name `@t/errors`,
  deps `hono`/`zod`/`@t/logging`, `exports`, scripts), `tsconfig.json`, `vitest.config.ts`,
  `README.md`, and Vitest test suite all landed; broken `@/errors` / `@/entities/errors` aliases
  rewritten to relative imports. Package now typechecks and is installable. Remaining consumer
  wiring (errorHandler mount in apps/api, analytics capture, request logger + requestId) moved to
  P2.
- [x] **`@t/db` full rewrite shipped + integration tests + migration workflow verified
  (2026-04-26).** `DbClient` port, `DrizzleDbClientImpl`, pgvector-backed `EmbeddingStore`,
  `registerDbDI`, and `migrations/{0000_secret_miss_america,meta/_journal}.sql` all present; legacy
  Supabase code removed. `drizzle-kit generate` produces canonical migrations; `drizzle-kit migrate`
  applies cleanly on fresh Postgres. Integration tests pass 20/20 against live pgvector Postgres.
  Unit tests pass 73/73. `DrizzleDbClientImpl.transaction()` routes `raw()` through tx-scoped
  `postgres-js` client. `docker-compose.db.yml` mapped to `5433:5432` to avoid Windows native
  Postgres conflict. Legacy `0000_enable_pgvector.sql` + `0001_init_schema.sql` superseded by
  Drizzle Kit-generated migration.
- [x] **DI tokens registry hoisted; platform doc created (2026-04-26).** `dependencyKeys.global`
  includes all 10 tokens (`CONFIG` / `LOGGER_FACTORY` / `LOGGER` / `ANALYTICS` / `AUTH` / `CACHE` /
  `DB` / `USER_REPOSITORY` / `EMBEDDING_STORE` / `BILLING_REPOSITORY`) +
  `request.REQUEST_ANALYTICS`. All 10 resolved by `apps/api` composition root (2026-04-25).
  `docs/architecture/platform/dependency-injection.md` created 2026-04-26; package README and token
  snapshot test also added. `@t/errors` has no DI surface and is intentionally excluded. Remaining
  open items: `apps/web`/`apps/mobile`/`apps/desktop` composition roots; `REQUEST_ANALYTICS`
  request-scope middleware — tracked in packages/dependency-injection.md.
- [x] **`@t/config` legacy carryovers resolved (2026-04-26).** `GCPConfigSchema.ts` deleted; `GCPConfig` type removed from `ConfigTypes.ts`; `gcp` field removed from `ConfigValuesSchema`, `ConfigRepository` port, and `ConfigRepositoryImpl`. `K_SERVICE` sentinel replaced with `environment === 'local' || environment === 'development'` derivation in `ConfigRepositoryImpl`. `mongoUri` field dropped from `SystemConfigSchema`. `REVENUECAT_WEBHOOK_AUTH_HEADER` moved from bare `process.env` read into `RevenueCatConfigSchema.webhookAuthHeader` (z.string().min(1)); `ConfigRepositoryImpl` now reads it; `apps/api/src/composition.ts` reads it from `config.revenueCat?.webhookAuthHeader`. `ConfigTypes.ts` now re-exports all 6 previously-missing types: `AnalyticsConfig`, `AuthConfig`, `DbConfig`, `LoggingConfig`, `RedisConfig`, `RevenueCatConfig`. `RailwayConfigSchema` and `BillingConfigSchema` not added — `databaseUrl` lives on `DbConfigSchema`; billing is fully covered by `RevenueCatConfigSchema` + `StripeConfigSchema`; no wrapper needed. `EnvironmentSchema` enum (`development|staging|production|local|testing`) is canonical on-disk — doc drift is tracked separately in documentation drift log. 100%/100%/100%/100% coverage threshold passes across all 8 test files (116 tests). `apps/api` 94/94 tests still pass.
- [x] **`@t/cache` / `@t/billing` / `@t/db` DI keys hoisted.** `CACHE_DEPENDENCY_KEY`,
  `DB_DEPENDENCY_KEY`, `USER_REPOSITORY_DEPENDENCY_KEY`, `EMBEDDING_STORE_DEPENDENCY_KEY`, and the
  previously-string-literal `"billingRepository"` now alias
  `dependencyKeys.global.{CACHE,DB,USER_REPOSITORY,EMBEDDING_STORE,BILLING_REPOSITORY}`. (`@t/auth`
  and `@t/logging` token hoists are still pending — see DI-tokens entry above.)
- [x] **Test runner convention drift resolved (2026-04-25).** Repo standard is now Vitest across the
  board. `@t/config` and `apps/api` were converted to Vitest; `@t/auth` was already on Vitest (prior
  claim of `bun test` was incorrect). `@t/analytics`/`@t/cache`/`@t/billing`/`@t/logging` were
  already Vitest. Root `bunfig.toml` `[test]` block stripped. No `bun:test` anywhere in the repo.
- [x] **`@t/logging` platform-doc reconciliation — resolved 2026-04-26.**
  `docs/architecture/platform/logging.md` rewritten to describe the shipped Winston v3 + PostHog
  OTLP impl (frontmatter `last_audited: 2026-04-26`); no pino references remain. `apps/api`
  composition root already calls both `registerLoggerFactoryDI` and `registerLoggerDI`; package name
  flipped to `@t/logging`. Package status raised 🟡 → 🟢; remaining gaps (browser/RN adapter,
  apps/{website,mobile,desktop} wiring, SIGTERM flush) tracked under P2.
- [x] **`registerAnalyticsDI` Environment-enum mismatch — resolved 2026-04-26.** `EnvironmentSchema` collapsed to 4 values (`development|local|testing|production`); `@t/analytics` `Environment` type aligned to match. `registerAnalyticsDI` now accepts the canonical `Environment` type from `@t/config` with no cast. `staging` and `dev`/`prod`/`preview` vocabulary fully removed from all enum sites.
- [x] **`@t/db` integration tests + migration workflow verified (2026-04-26).** `drizzle-kit
  generate` produces canonical migrations + `meta/_journal.json`; `drizzle-kit migrate` applies
  against live Postgres. Docker Compose pgvector container on port 5433. Integration tests 20/20;
  unit tests 73/73. Transaction-scoped `raw()` fix shipped.
- [x] **`registerBillingDI` is lazy — RESOLVED 2026-04-26.** ~~Uses `asFunction`, so config errors
  only surface at resolve time, not registration time. The composition-root `try/catch` in
  `apps/api/src/composition.ts#buildContainer` will not catch them. Either eager-validate inside the
  registrar or move billing to an `asClass(...).singleton()` pattern consistent with the others.~~
  asFunction → asValue in `registerBillingDI`; constructor-time validation now eager. Closed
  2026-04-26.
- [x] **`REVENUECAT_WEBHOOK_AUTH_HEADER` added to `@t/config` schema (2026-04-26).**
  `RevenueCatConfigSchema.webhookAuthHeader` (z.string().min(1)) added;
  `ConfigRepositoryImpl.revenueCat` getter and `_buildRawForSchema` both read from
  `REVENUECAT_WEBHOOK_AUTH_HEADER`; `apps/api/src/composition.ts` reads from
  `config.revenueCat?.webhookAuthHeader` instead of bare `process.env`.
- [x] **Webpack `node:process` URI scheme blocker on apps/web build — RESOLVED 2026-04-28.** Root
  cause: `ConfigRepositoryImpl` had an explicit `import process from 'node:process'` that webpack
  could not resolve for the browser bundle target. Fix: removed the explicit node: import (commit
  `d7dfa2c`); `process.env` is already shimmed by Next.js/webpack without an explicit import.
  Architectural boundary preserved: `@t/config` main export (`.`) re-exports `ConfigRepositoryImpl`
  but `apps/web/src/lib/composition.ts` carries `import 'server-only'` preventing client inclusion;
  browser-side code uses `@t/config/browser` (the entities-only subpath, no `ConfigRepositoryImpl`).
  Follow-on: schema hard-fail enforcement (`AnalyticsConfigSchema`, `PostHogConfigSchema`,
  `WebsiteConfigSchema`, `DesktopConfigValuesSchema` all require POSTHOG_API_KEY via `.min(1)`);
  `analytics-browser` NoOp fallback removed (schema guarantees key at boot); CI/yml refactored with
  YAML anchors. `bun run build` + `bunx size-limit` both pass: 553 kB brotli well under 1800 kB
  budget. 197 @t/config tests, 36 apps/web tests — all green.

## P2 — App wiring (after P0/P1 settle)

### apps/api ([↗](./apps/api.md))

- [x] Build composition root: instantiate DI container in `src/index.ts`; call
  `registerConfigRepoDI` + `registerLoggerDI` first. *(2026-04-25 —
  `src/composition.ts#buildContainer()`)*
- [x] Wire `registerAuthDI` + `registerDbDI` + `registerCacheDI` + `registerBillingDI` +
  `registerAnalyticsDI`. *(2026-04-25 — all bound in `buildContainer()`.)*
- [x] Replace legacy inline Supabase auth in `trpc/context.ts` with Clerk client sourced from the
  resolved `auth` port. *(2026-04-25.)* Hono `clerkAuth` middleware that populates `c.var.userId` /
  `c.var.user` before tRPC runs landed 2026-04-26 (`src/middleware/clerkAuth.ts`).
- [x] Mount `POST /api/webhooks/{clerk,revenuecat}` outside `/trpc/*` with signature verification.
  *(2026-04-26 — `src/routes/webhooks/clerk.ts` (svix) + `src/routes/webhooks/revenuecat.ts`
  (timing-safe shared-secret), mounted in `src/index.ts:40-41`.)*
- [x] Port `auth.ts`/`users.ts`/`projects.ts` routers off `NOT_IMPLEMENTED` stubs onto `ctx.db`
  (Drizzle-backed `DbClient`) + port-backed repositories from `@t/db`. *(Done 2026-04-27)*.
- [ ] Fix `src/routers/__tests__/users.test.ts` — currently calls non-existent
  `users.getCurrentUser`. *(Now subsumed by the 96-test suite, which extends mock context with all
  required fields.)*
- [x] Mount `app.onError(errorHandler)` (from `@t/errors`). *(2026-04-26 —
  `apps/api/src/index.ts`.)* ~~Still open: `process.on('unhandledRejection')`; per-request
  `RequestLogger` + `requestId` middleware so the analytics-capture TODO in `errorHandler.ts` can
  fire.~~ **Both closed 2026-04-26** — `apps/api/src/lifecycle.ts` (`installProcessHandlers`);
  `apps/api/src/middleware/request-context.ts` (request-scoped requestId/logger/analytics on Hono
  context).
- [x] Wire `@t/errors` delivery layer to DI: bind `RequestLogger` + `requestId` from per-request
  middleware so `errorHandler` stops falling back to the global logger; resolve the canonical
  analytics client so the exception-capture TODO in `errorHandler.ts` can fire (depends on
  `registerAnalyticsDI`). *(2026-04-26 — `errorHandler` now reads `requestId` / `logger` /
  `analytics` from Hono context (all OPTIONAL, all degrade gracefully).
  `apps/api/src/middleware/request-context.ts` produces all three per request.
  `RequestAnalyticsTracker.captureException(error, context?)` overload added
  (`packages/analytics/src/infrastructure/RequestAnalyticsTrackerImpl.ts:54-69`) so capture flows
  cleanly without an explicit distinctId at the call site.)*
- [x] Move CORS origin list + port to `ConfigRepository`. *(Done 2026-04-28 — `SystemConfigSchema`
  `corsOrigins` (default `localhost:3000,8081`, env `CORS_ORIGINS`) and `port` (default 8000, env
  `PORT`) shipped via `@t/config`; `apps/api/src/index.ts` reads both from DI; `.env.example` and
  `packages/config/README.md` updated.)*
- [x] Migrate from `bun:test` + `bunfig.toml` preload to Vitest + `vitest.config.ts`. *(2026-04-25 —
  `bunfig.toml` deleted; `vitest.config.ts` ships `setupFiles: ['./src/__tests__/setup.ts']`; 12/12
  passing.)*
- [x] Extend `/health` to probe Postgres + Redis. *(Done 2026-04-27)*
- [ ] Add queue consumer + cron entrypoints; emit OpenAPI from `AppRouter`.
- [x] Register SIGTERM hook that awaits `OTLPWinstonTransport.shutdown()` to flush buffered PostHog
  logs. *(2026-04-26 — `feat(api): graceful SIGTERM/SIGINT flush via shutdownLogging`;
  `apps/api/src/lifecycle.ts` registers SIGTERM/SIGINT handlers that `await shutdownLogging()`
  before exit.)*

### apps/web ([↗](./apps/web.md))

- [x] Swap Supabase → Clerk (2026-04-25): installed `@clerk/nextjs ^7.2.3`; `<ClerkProvider>`
  mounted in `layout.tsx`; `clerkMiddleware()` in `middleware.ts`; `/sign-in/[[...sign-in]]` +
  `/sign-up/[[...sign-up]]` catch-all routes added; `src/app/login/` + `providers.tsx` deleted;
  `dashboard/page.tsx` server component using `await auth()` + `redirectToSignIn()`; tRPC provider
  injects `Authorization: Bearer ${await getToken()}` via `@clerk/nextjs` `useAuth()`. Consuming
  projects supply Clerk credentials per env.
- [x] Add `src/app/error.tsx` and `src/app/global-error.tsx` *(2026-04-26 — both `'use client'`;
  both call `posthog.captureException(error)` in `useEffect`; minimal Tailwind fallback.
  `global-error.tsx` deviates from original spec by skipping `next/error` since its types are
  Pages-Router-only. Boundaries route directly to `posthog-js` rather than through `@t/errors` —
  `@t/errors` still has no React boundary export. `@t/logging` remains node-only and is
  intentionally not imported from any `'use client'` boundary.)*
- [x] Fix broken Playwright spec (2026-04-25): `e2e/login.spec.ts` renamed → `e2e/home.spec.ts` with
  title regex `/Template Web App/`; new `e2e/auth-routes.spec.ts` covers `/sign-in`, `/sign-up`, and
  signed-out `/dashboard` redirect-to-sign-in. All specs guard on `CLERK_PUBLISHABLE_KEY` and skip
  cleanly when absent.
- [x] Add `"test:e2e": "playwright test"` script (2026-04-25). `playwright.config.ts` `webServer`
  runs `next dev --port 3000`.
- [x] Port client-side env reads to `@t/config` client-safe schema. *(2026-04-26 — `f518fe1` —
  `WebConfigValuesSchema.client.trpcUrl` (sourced from `NEXT_PUBLIC_TRPC_URL`) now flows from
  `@t/config` into `apps/web/src/lib/trpc/provider.tsx`; no bare `process.env` read remains for this
  value.)*
- [x] Drop `@supabase/*` deps (2026-04-25 — Clerk migration completed; no `@supabase/*` deps remain
  in `apps/web/package.json`).
- [x] Mount client-side analytics (`posthog-js` `<PostHogProvider>` + `identify()` on Clerk auth
  state). *(2026-04-26 — `posthog-js@1.372.1`; `instrumentation-client.ts` runs Next 15 native
  one-time `posthog.init()`; `<PHProvider>` wraps app in `layout.tsx`; `<PostHogPageView />` handles
  SPA pageviews via `usePathname`+`useSearchParams` and Clerk `identify()`/`reset()` via
  `useAuth`+`useUser`. `person_profiles: 'identified_only'`, `capture_pageview: false`.
  `.env.example` adds `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`. Deliberate split:
  browser uses `posthog-js` directly; `@t/analytics` (posthog-node) stays server-only.)*
- [ ] Reconcile port: dev/Playwright/`webServer` use `:3000`, monorepo doc mentions `:3001` for web
  SSR.

### apps/website ([↗](./apps/website.md))

- [x] Adopt declared `@t/config` dep — swap `sitemap.ts` + `robots.ts` `process.env.SITE_URL` reads
  for `ConfigRepository.website().siteUrl`. *(2026-04-26)*
- [x] Mount `PostHogProvider` + pageview tracking once `@t/analytics` browser adapter exists.
  *(2026-04-26 — using posthog-js directly, consistent with apps/web browser/server split)*
- [x] Filesystem-driven MDX collection (glob `src/content/blog/*.mdx`, extract `meta`, sort by
  date). *(2026-04-26)*
- [x] Install Shadcn (`components.json`, full token set, `components/ui/*`, `cn()`). *(2026-04-26 —
  button, card, badge, nav-menu, separator primitives installed)*
- [x] Per-page SEO (OG images via `next/og`, canonical URLs, JSON-LD). *(2026-04-26)*
- [ ] Wire `/api/health` into `railway.toml` healthcheck.
- [x] Add tests (unit + e2e). *(2026-04-26 — Vitest 10/10, Playwright 8/8)*
- [ ] `@types/react` pinned to 19.0.12 via root `package.json` overrides to resolve Shadcn/Next.js
  version conflict. *(2026-04-26 — build fix; verify on `@types/react` minor bumps)*

### apps/mobile ([↗](./apps/mobile.md))

- [x] Swap Supabase → Clerk: replace `src/lib/supabase.ts` + `providers.tsx` + `app/index.tsx` +
  `app/(auth)/login.tsx` with `@clerk/clerk-expo` + `tokenCache: expo-secure-store` +
  `getToken()`-based Bearer. *(2026-04-26 — commits `480030f`, `ffa78f7`)*
- [ ] Install `expo-apple-authentication`, `expo-auth-session`; register `template://clerk` OAuth
  deep link.
- [x] Install `react-native-purchases`; add `Purchases.configure`, offerings/paywall, `(billing)/`
  stack. *(2026-04-27 — commit `5ec3157`; `RevenueCatProvider` in providers.tsx; paywall screen
  wired; `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` + `_GOOGLE_KEY` placeholder env vars.)*
- [x] Install `posthog-react-native`; `identify()` on auth state; screen capture via expo-router
  hook. *(2026-04-27 — wired via `@t/analytics-rn` and `AnalyticsIdentityBridge` in
  `src/lib/providers.tsx`)*
- [ ] Install `expo-notifications`; register token, Android channel, `notifications.subscribe` tRPC
  consumer.
- [x] Add `app/+error.tsx` / `+not-found.tsx` + `@t/errors` adapter. *(2026-04-27 — `+error.tsx`
  captures to PostHog)*
- [ ] Add `eas.json` + Build/Submit/Update profiles.
- [ ] Add tests (Vitest + `@testing-library/react-native`; e2e via Detox or Maestro).
- [ ] NOTE: stay on Tailwind v3 until NativeWind v5 ships.
- [x] Wire `@t/config` for mobile. *(2026-04-27 — `MobileConfigValuesSchema` added; DI container
  wired)*
- [x] Wire `@t/logging-rn` for mobile. *(2026-04-27)*

### apps/desktop ([↗](./apps/desktop.md))

- [x] **Fix broken build:** `hooks/useNavigate.ts` deleted (vestigial stub, never imported by any
  renderer file); `react-router-dom` removed from `package.json`. App uses Clerk
  `<SignedIn>`/`<SignedOut>` conditional rendering. `bun run typecheck` exits 0; `electron-vite
  build` exits 0. *(2026-04-26)*
- [x] Wire RevenueCat Web SDK in renderer. `DesktopBillingProvider` + `Paywall` component;
  `@revenuecat/purchases-js` initialised via `VITE_REVENUECAT_PUBLIC_API_KEY`; same RC Web SDK
  pattern as `@t/billing-browser` with `VITE_*` prefix. Stripe is server-only. Consuming projects
  supply `VITE_REVENUECAT_PUBLIC_API_KEY`. *(2026-04-27 — `feat(desktop): wire RC Web SDK + paywall
  in renderer`)*
- [x] **Remove stale @t/db dep** — listed in package.json but never imported; renderer should never
  ship Node DB code. Removed. *(2026-04-27)*
- [x] Swap Supabase → Clerk: replace `lib/supabase.ts` + `components/Login.tsx` +
  `Dashboard.signOut`; rewrite `authHeaderLink` to call Clerk `getToken()`; decide electron-store
  session persistence vs Clerk localStorage. *(Done 2026-04-27 — verified existing implementation
  uses headless email-code flow; `Authorization: Bearer` wired in `providers.tsx`; no Supabase
  residue.)*
- [x] Validate `VITE_*` env via `@t/config` (no more empty-string fallbacks). *(Done 2026-04-27 —
  `DesktopClientConfigSchema` added to `@t/config`; renderer refactored to use
  `desktopClientConfig`.)*
- [ ] Wire `@t/logging` in the main process (winston works in node); add a renderer-safe logging
  adapter for the UI side (winston won't run in Chromium). Call `crashReporter.start()` in main.
- [x] Add renderer `ErrorBoundary` via `@t/errors`; register `process.on('uncaughtException' |
  'unhandledRejection')` in main. *(2026-04-27)*
- [ ] Add Playwright `_electron` harness + smoke test.
- [ ] Auto-update (`electron-updater`); code-signing (macOS notarization + Windows cert) in
  `electron-builder.yml`.
- [ ] Revisit `sandbox: false` once preload is pure.

## P3 — Code-quality follow-ups

- [x] **Extract `SessionUser` + `readBearerToken` shared helper — 2026-04-27.** Moved to
  `apps/api/src/lib/auth/session.ts`. Both `clerkAuth.ts` and `trpc/context.ts` now import from the
  shared helper and re-export `SessionUser` so all existing test imports remain valid. `tsc
  --noEmit` exits 0; 135/135 tests pass.

## P3 — Infra polish

### CI check suite ([↗](./ci.md)) — top P0 items surfaced here

- [x] Add `"test"` + `"test:coverage"` scripts to every app/package (2026-04-25) — silent no-op
  eliminated.
- [x] Add format-check step (`biome format --check`) — landed 2026-04-25 as a parallel fast-tier
  job.
- [x] Add secret scan (gitleaks) on diff — landed 2026-04-25.
- [x] Add concurrency `cancel-in-progress` for PRs — landed 2026-04-25.
- [x] Add commit-lint job (PR title + recent commits via `bunx commitlint --from=...--to=...
  --verbose`) — already shipped (predates 2026-04-26 audit; lefthook commit-msg hook + `commitlint`
  job in `.github/workflows/ci.yml` lines 47–59).
- [x] Add bundle-size budget for apps/web + apps/api (size-limit v12) — landed 2026-04-26 (commit
  `4212643`); see Changelog above.
- See [ci.md](./ci.md) for remaining P2–P3 CI backlog (E2E expansion, integration test tier, knip,
  madge, license check, SBOM, stale dep report).

### CI gate follow-ups (opened 2026-04-28) — cross-ref: `.github/workflows/ci.yml`

#### CI-01 — `doctor --ci --fast` duplicates T3 test work

- **Status:** open
- **Owner:** —
- **Files:** `scripts/doctor.ts` L233–278 (`phase4()`), `scripts/doctor.ts` L448 (`--fast` branch),
  `.github/workflows/ci.yml` L390–406 (`doctor` job)
- **Effect:** The T5 `doctor` job runs `bun run doctor --ci --fast`. `--fast` skips phases 5 (build)
  and 6 (live-boot), but phase 4 still calls `turbo run test:coverage` unconditionally (L234). T3
  `test` already ran the full coverage suite and uploaded it as the `coverage-report` artifact. The
  duplication wastes ~3–4 minutes per PR and uploads a redundant second coverage report.
- **Resolution options:**
  - **A (recommended):** Add a `--skip-tests` (or `--skip-phase=4`) flag to `doctor.ts`. Have the CI
    `doctor` job download the `coverage-report` artifact and pass `--skip-tests`. Phase 4 reads the
    pre-built artifact instead of re-running turbo. Eliminates duplication with zero coverage signal
    loss.
  - **B:** Drop `doctor` from CI entirely; keep as a local dev tool only. Loses the boot-probe and
    structured JSON output that CI currently surfaces.
  - **C:** Accept the duplication (status quo).

#### CI-02 — `size-limit` artifact consumption not verified end-to-end

- **Status:** investigation needed
- **Owner:** —
- **Files:** `apps/web/package.json` L60–66 (`size-limit` field), `apps/api/package.json` L51–57
  (`size-limit` field), `.github/workflows/ci.yml` L295–330 (`size-limit` job)
- **Effect:** T5 `size-limit` job downloads the `build-output` artifact (ci.yml L318–322) then runs
  `bunx size-limit` in each app's working directory (L325–330). If a `size-limit` config entry
  contained a `"build"` key pointing back to turbo, the download would be wasted and a silent
  rebuild would occur, defeating the artifact-download pattern.
- **Finding (2026-04-28):** Both configs are `path`-only — neither `apps/web/package.json` nor
  `apps/api/package.json` has a `"build"` key in their `"size-limit"` array. The configs point
  directly at build outputs (`.next/static/**/*.js` and `dist/index.js`). However, the end-to-end
  flow has not been exercised in CI with actual artifact data — it is unknown whether the downloaded
  paths resolve correctly inside the GitHub Actions working directory after `download-artifact`
  places the files.
- **Resolution options:**
  - **A (recommended):** Run a PR that touches `apps/web` or `apps/api`, let the `size-limit` job
    execute with a real artifact download, and verify the job passes without a rebuild. Capture the
    CI log as evidence. If it passes, mark this item closed.
  - **B:** Add a dry-run step to the `size-limit` job that prints the resolved paths before
    executing the size check, making any path-mismatch visible in CI logs without requiring a
    separate investigation PR.

### General infra

- [x] Add `"test"` + `"test:coverage"` scripts to every app/package (2026-04-25) — CI test job no
  longer silently no-ops. *(Repo-standard runner is Vitest; no `bun:test`.)*
- [x] Wire Release Please release pipeline
  - **2026-04-26** — Changesets replaced with Release Please. Fully automated: conventional commits
    → release PR → GitHub Release. Zero developer overhead.
- [ ] Enable Turborepo remote cache (Vercel-hosted or self-hosted).
- [ ] Add `postgres` service to `railway.toml` (with `pgvector`).
- [x] Add `redis` service to `railway.toml` (bitnami image, AUTH + appendonly). **Done 2026-04-26**
  — `[redis]` block in `railway.toml` with `bitnami/redis:7.4`, AOF, volume mount, `REDIS_URL` in
  `[api.env]`. Manual Railway provisioning steps documented in `docs/prd-status/packages/cache.md`.
- [ ] Add worker service(s) for queue consumers.
- [ ] GitHub Actions → Railway deploy per service per env; preview env per PR.
- [ ] Consolidate `.env.*` globalDependencies in `turbo.json` (today only `.env.*local` busts
  cache).
- [x] **Standardize `format` script** — all 18 packages/apps now use `biome check --write .`
  (lint+format). Missing `check`/`format` scripts added to `@t/config` and `@t/billing`.
  *(2026-04-27)*
- [x] **Fix root `clean` script** — swapped `rm -rf node_modules` to `rimraf node_modules` for
  cross-platform compat. *(2026-04-27)*
- [ ] Pin Bun version once (`1.3.11` is hardcoded in 4 places in `ci.yml`).
- [ ] Add Windows + macOS to CI matrix (currently `ubuntu-latest` only).
- [ ] CI service container for Redis integration tests (per `@t/cache`). Local dev uses
  `docker-compose.cache.yml` (bitnami/redis:7.4 on port 6380); GitHub Actions service container
  deferred.
- [ ] CI service container / ephemeral Railway DB for `@t/db` integration tests.

## Documentation drift log

- [x] `docs/architecture/ARCHITECTURE.md` links `platform/db.md` → actual file is
  `platform/database.md` (broken link). **Fixed 2026-04-26.**
- [x] `ARCHITECTURE.md` checklist lags recent commits — every box under `packages/{analytics, auth,
  cache, billing, logging}` still unchecked despite scaffolding having landed. **RESOLVED
  2026-04-26:** all five packages verified on disk (`entities/`, `infrastructure/`,
  `dependency-injection/` present with at minimum one file each and a `register*DI.ts`).
  ARCHITECTURE.md already showed all scaffold items as `[x]` — no boxes required flipping. Gap
  closed.
- [x] `docs/architecture/platform/analytics.md` (older, 375-line) coexists with
  `docs/architecture/platform/analytics/analytics.md` (fresh target). Folder version is canonical;
  parent file is superseded. (2026-04-27)
- [x] `docs/architecture/platform/dependency-injection.md` — RESOLVED (2026-04-26). Doc now exists;
  platform doc created alongside package README and token snapshot test as part of DI package 🟢
  flip.
- [x] `docs/architecture/platform/errors.md` — already present and accurate (prior gap was stale;
  verified 2026-04-25).
- [x] `docs/architecture/platform/logging.md` describes a pino target; shipped impl is winston.
  **Resolved 2026-04-26** — platform doc rewritten to describe winston + PostHog OTLP;
  `last_audited: 2026-04-26`. Schema-comment drift in `LoggingConfigSchema` source resolved
  2026-04-26 — comment now reads "winston-based".
- [x] Module index stale note — **RESOLVED (2026-04-27).** All seven platform zoom-in docs exist;
  ARCHITECTURE.md line 150 corrected to: "All platform zoom-in docs exist under
  `docs/architecture/platform/.`"
- [x] `EnvironmentSchema` enum drift: on-disk `development|staging|production|local|testing` vs doc `local|staging|production`. **Resolved 2026-04-26** — platform/config.md and prd-status docs updated. Then enum collapsed to 4-value `development|local|testing|production` (staging hard-dropped 2026-04-26).
- [x] `apps/web/e2e/login.spec.ts` title drift resolved (2026-04-25) — file renamed to
  `home.spec.ts` with `/Template Web App/` title regex; new `auth-routes.spec.ts` added for sign-in
  / sign-up / dashboard-redirect coverage.

## Blocks graph

```text
P0 decisions
├── auth provider ───────────► @t/auth rewrite ──► apps/{api,web,mobile,desktop} auth wiring
│                                                └► apps/api /api/webhooks/clerk route
│                                                └► @t/db users.clerk_user_id migration
├── db strategy ─────────────► @t/db rewrite ✓ ─► apps/api context.ts off legacy supabase field
│                             └── migration tool ─► first migration ─► integration tests
└── @t/* vs @t/* ─────► all package.json renames ─► all consumer imports

P1 foundations
├── @t/errors package ✓ ─────► apps/api app.onError mount ─► error boundaries in web/mobile/desktop
├── DI tokens hoisted ───────► every register*DI wired in apps/api composition root (incl. LOGGER)
└── @t/config cleanup ───────► every app reads env through the port

P2 app wiring (unblocked only after the above)
└── apps/{api,web,website,mobile,desktop} wire all ports, complete Clerk swap

P3 infra polish — parallelizable throughout
```

## Deferred from 2026-04-27 audit fix pass

**Code-level (not audit scope):**

- `packages/db/tests/infrastructure/InMemoryEmbeddingStore.test.ts:52` — Biome v2 flags
  `lint/suspicious/noNonNullAssertedOptionalChain` (`hits[1]?.similarity!` mixes optional chain with
  non-null assertion). Fix: `(hits[1]?.similarity ?? 0) - 0.01`. Blocks `bun run check` cleanly
  passing post-Biome-v2 migration.
- Unused-import warnings (advisory-only) in `@t/analytics`, `@t/billing-browser`, `@t/db` — Biome
  v2's `noUnusedImports` is in the recommended ruleset (was opt-in in v1).
- `apps/api/src/routes/bootstrap.ts:26` — uses deprecated TC39 `assert { type: 'json' }`; should be
  `with { type: 'json' }`. Biome v2 flags as parse error.
- `packages/billing-browser/biome.json` — nested `root: true` in workspace context. Run `bunx biome
  migrate --write` from repo root to flatten, OR remove the `root: true` line manually.
- `packages/dependency-injection/tsconfig.json` — TS5090: `Non-relative paths are not allowed when
  'baseUrl' is not set`. Add `"baseUrl": "."` or set explicit relative paths.
- `packages/config/entities/schemas/__tests__/WebsiteConfigSchema.test.ts` — ZodError on
  `system.cronSecret` required field. Schema/test drift; align tests with current schema (or relax
  schema if `cronSecret` should be optional).

**Lint-blocker fix attempted 2026-04-27, reverted cleanly** — the fixes above for
`noNonNullAssertedOptionalChain` + 3 unused-import sites were correct but couldn't land via
pre-commit hook because the 4 issues immediately above are hook-monorepo-wide blockers. Needs a
dedicated session resolving all 4 simultaneously, then the lint fix re-applies trivially.

**Tooling activations (one-step manual):**

- Renovate alternative: switched to Dependabot per low-friction preference; no manual activation
  needed (built-in to GitHub).
- `secrets.RELEASE_PAT` — required for release-please push if branch protection is enabled on
  `main`. GitHub App or fine-grained PAT.
- JUnit reporter in `vitest.config.ts` — needed before `dorny/test-reporter@v3.0.0` step is added to
  `ci.yml`.

**Migration follow-ups:**

- Per-package `biome.json` `$schema` URLs still reference `1.9.0` — should bump to `2.4.13` for
  consistency. Functional impact: none (extends-only configs inherit from migrated root). Cosmetic.
- Full `@biomejs/biome` devDep version bump to `^2.4.13` — Biome runs through lefthook here, so no
  root devDep declared. Investigate whether to declare it explicitly for IDE integration
  consistency.

**Info-tier from W1–W6 (queued, not fixed this turn):**

- TS project references — keeping flat for now, monorepo velocity wins
- FUNDING.yml — N/A for private repo
- SUPPORT.md — N/A for private repo

**Working-tree drift surfaced:**

- Heavy in-flight Phase 3 scaffolding work (apps/api, apps/desktop, apps/mobile, apps/web,
  apps/website) was modified in working tree but unrelated to audit fix scope; left alone.
