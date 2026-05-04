---
name: apps/api bootstrap status
last_audited: 2026-04-28
maintainer_contract: any agent editing apps/api/** MUST update this file and docs/prd-status/matrix.md
---

> **2026-04-28 update:** queue consumer (`src/worker.ts`) + cron (`src/cron.ts`) entrypoints landed
> in commit `3aa4b61` along with the `@t/queue` finalization. See
> `docs/architecture/platform/queue.md` and `docs/prd-status/packages/queue.md`. OpenAPI emission
> (`/openapi.json`) is still pending under W3.

# apps/api — bootstrap wiring status

Framework: Hono + tRPC (Bun, port 3001)

## Entry points

- `apps/api/src/index.ts` — calls `buildContainer()` once at boot; calls
  `installProcessHandlers(container)` immediately after (NEW 2026-04-26); Hono app,
  `app.onError(errorHandler)` (from `@t/errors`), CORS, `app.use('*',
  createRequestContextMiddleware(container))` (NEW 2026-04-26 — per-request
  requestId/logger/analytics on Hono context), `/health`, `/api/webhooks/clerk` +
  `/api/webhooks/revenuecat` mounted before `clerkAuth`, `clerkAuth` Hono middleware scoped to
  `/trpc/*`, `/trpc/*` mount, `export default { port, fetch }`
- `apps/api/src/middleware/request-context.ts` (NEW 2026-04-26) — exports
  `createRequestContextMiddleware(container)`. Per-request: generates `requestId` via
  `crypto.randomUUID()`, builds child logger via `createGlobalLogger({ requestId, metadata: {
  method, path } })`, resolves request-scoped analytics via `container.createScope()` registering `{
  parent, requestId, userId? }`. Sets `requestId`, `logger`, `analytics` on Hono context (consumed
  by `@t/errors` `errorHandler`). Echoes `X-Request-ID` response header.
- `apps/api/src/lifecycle.ts` (NEW 2026-04-26) — exports `installProcessHandlers(container)`.
  Registers `process.on('unhandledRejection')` and `process.on('uncaughtException')`. Uses the
  global `AnalyticsTracker` (not request-scoped) and calls `captureException(error, 'system', {
  source })` — process-level events have no user context, so the explicit `'system'` distinctId is
  intentional. **SIGTERM and SIGINT are now handled here as well (2026-04-26)** via `await
  shutdownLogging()` — the helper awaits `OTLPWinstonTransport.shutdown()` so buffered PostHog logs
  flush before `process.exit(0)`.
- `apps/api/src/composition.ts` — `buildContainer()` wires all 10 DI tokens (CONFIG, LOGGER_FACTORY,
  LOGGER, ANALYTICS, AUTH, CACHE, DB, USER_REPOSITORY, EMBEDDING_STORE, BILLING_REPOSITORY) +
  request-scoped REQUEST_ANALYTICS
- `apps/api/src/composition.test.ts` — asserts every token in `dependencyKeys.global` resolves
- `apps/api/src/middleware/clerkAuth.ts` — exports `createClerkAuthMiddleware(container): MiddlewareHandler<{ Variables: { userId: string | null; user: SessionUser | null } }>`. Reads `Authorization: Bearer <jwt>`, calls `auth.currentUser`, populates `c.var.userId` / `c.var.user`. Never throws — downstream procedures gate access.
- `apps/api/src/routes/webhooks/clerk.ts` — exports `createClerkWebhookApp(container)`. svix
  signature verification (svix-id / svix-timestamp / svix-signature) → `WebhookEventSchema` parse →
  calls `UserRepository.create` / `findByClerkUserId` + `update` / `findByClerkUserId` + `delete`
  AND `auth.syncFromWebhook(event)`. Repo errors → 500 (svix retries).
- `apps/api/src/routes/webhooks/revenuecat.ts` — exports `createRevenueCatWebhookApp(container)`.
  Header-shared-secret verify via `verifyRevenueCatWebhook` from `@t/billing` (timing-safe compare
  against `config.revenueCat.webhookAuthHeader`) → `RevenueCatWebhookEventSchema` parse →
  `billingRepository.handleRevenueCatEvent(event)`. 401 / 400 / 500 status codes per failure mode.
- `apps/api/src/trpc/index.ts` — `initTRPC`, `publicProcedure`, `protectedProcedure`,
  `adminProcedure`
- `apps/api/src/trpc/context.ts` — `createContext({ req, container, c? })`; consumes `c.var.userId`
  / `c.var.user` from the Hono `clerkAuth` middleware (fast path); falls back to in-context Bearer
  verification when the Hono context isn't reachable (test paths). Exposes `db`, `userRepository`,
  `projectRepository`, `cache`, `logger`, `auth`, `analytics`, `requestAnalytics`, `userId`, `user`
  on `Context`.
- `apps/api/src/routers/index.ts` — `appRouter = { auth, users, projects }` (+ `AppRouter` export).
  Routers ported to `userRepository` and `projectRepository` (2026-04-27).
- `apps/api/vitest.config.ts` — `setupFiles: ["./src/__tests__/setup.ts"]` (vitest)

## @t/* imports

Declared dependencies in `apps/api/package.json` (as of 2026-04-26):

- `@t/dependency-injection`, `@t/config`, `@t/logging`, `@t/cache`, `@t/auth`, `@t/analytics`,
  `@t/billing`, `@t/db`, `@t/errors` — all consumed by `src/composition.ts` / `src/index.ts` /
  webhook routes
- `hono`, `@hono/trpc-server`, `@trpc/server`, `zod`, `svix` (framework, not @t/*)

## Wiring checklist (wired | partial | missing | — N/A)

| Concern | Status | Evidence |
| --- | --- | --- |
| Framework (Hono app, route mount, tRPC adapter) | wired | `src/index.ts` Hono; `/trpc/*` via `@hono/trpc-server` |
| Config loaded at startup (Zod validated) | wired | `registerConfigRepoDI` bound in `src/composition.ts#buildContainer`; `ConfigRepositoryImpl` validates at ctor |
| Logger instantiated + request logging | wired | `registerLoggerDI` + `registerLoggerFactoryDI` bound in `buildContainer`; `app.onError(errorHandler)` mounted with the resolved logger reaching it via DI. Per-request `requestId` + child logger now produced by `src/middleware/request-context.ts` (2026-04-26) and consumed by `@t/errors` `errorHandler` via Hono context. |
| Error middleware + unhandledRejection | wired | `app.onError(errorHandler)` mounted in `src/index.ts` (errorHandler from `@t/errors`). **`process.on('unhandledRejection' \| 'uncaughtException')` registered 2026-04-26** via `installProcessHandlers(container)` from `src/lifecycle.ts`. Process-level handlers use the global `AnalyticsTracker.captureException(error, 'system', { source })`. Request-scoped exception capture flows through the new `RequestAnalyticsTracker.captureException(error, context?)` overload via `src/middleware/request-context.ts`. |
| Auth middleware (Clerk) | wired | `createClerkAuthMiddleware(container)` from `src/middleware/clerkAuth.ts` mounted on `/trpc/*` in `src/index.ts:46`; populates `c.var.userId` / `c.var.user` from Bearer token via `auth.currentUser`. tRPC context consumes `c.var` (fast path). |
| DB client instantiated | wired | `registerDbDI` bound in `buildContainer`; `Context.db`, `Context.userRepository`, and `Context.projectRepository` resolved from container. `drizzle-kit migrate` against live Postgres still pending (consuming projects own this). |
| Cache client instantiated | wired | `registerCacheDI` bound in `buildContainer`; `Context.cache` resolved from container |
| Clerk webhook persistence | wired | `src/routes/webhooks/clerk.ts` — `createClerkWebhookApp(container)` mounted at `/api/webhooks/clerk`. svix verification kept (23 existing tests pass — chose not to swap to `@clerk/backend/webhooks`). Real `UserRepository` create / update / delete + `auth.syncFromWebhook(event)` invocation. Repo errors → 500 (svix retries). |
| Billing webhook route mounted | wired | `src/routes/webhooks/revenuecat.ts` — `createRevenueCatWebhookApp(container)` mounted at `/api/webhooks/revenuecat`. `verifyRevenueCatWebhook` from `@t/billing` reads `config.revenueCat.webhookAuthHeader` (timing-safe). 401 / 400 / 500 status codes per failure mode. |
| Analytics server tracker injected | wired | `registerAnalyticsDI` bound in `buildContainer`; `Context.analytics` + request-scoped `Context.requestAnalytics` resolved from container. Per-request scope created in `src/middleware/request-context.ts` (2026-04-26) and exposed on Hono context for `@t/errors` `errorHandler`. The previously-noted `Environment` enum mismatch with `@t/config` was a phantom — both packages already use `development\|local\|testing\|production`; no `as any` cast in `composition.ts`. |
| DI container built, registrars called | wired | `src/composition.ts#buildContainer()` instantiates the container, calls all registrars, returns it; `src/index.ts` calls it once at boot. `src/composition.test.ts` asserts every token in `dependencyKeys.global` resolves. |
| Tests exist | wired | **129/129 pass** at 100% statement/branch/function/line coverage (thresholds in `vitest.config.ts`). Test files cover: composition root + DI tokens (12), tRPC context (10 paths), procedures (6), routers (12), users router (1), Clerk webhook handler (6), Clerk webhook route (17), RevenueCat webhook route, clerkAuth middleware, **error-handling integration (NEW 2026-04-26)**, **lifecycle handlers (NEW 2026-04-26)**, **request-context middleware (NEW 2026-04-26)**. Test count moved 96 → 129 (33 new) on the @t/errors wiring pass. |

## Gap summary (ordered, concrete actions still open)

1. ~~Build composition root.~~ **Done 2026-04-25** — `src/composition.ts#buildContainer()`.
2. ~~Wire `registerAuthDI` + `registerDbDI` + `registerCacheDI`.~~ **Done 2026-04-25.**
3. ~~Hono `clerkAuth` middleware that populates `c.var.userId` / `c.var.user` before tRPC runs.~~
   **Done 2026-04-26** — `src/middleware/clerkAuth.ts` + mounted on `/trpc/*` in `src/index.ts`.
4. ~~`POST /api/webhooks/clerk` — svix verify + `UserRepository` persistence +
   `auth.syncFromWebhook`.~~ **Done 2026-04-26** — `src/routes/webhooks/clerk.ts`. (Note: kept svix
   directly; did not swap to `@clerk/backend/webhooks`.)
5. ~~Wire `registerBillingDI` + `registerAnalyticsDI`.~~ **Done 2026-04-25** — both bound. ~~Mount
   `POST /api/webhooks/revenuecat` (raw-body shared-secret verification).~~ **Done 2026-04-26** —
   `src/routes/webhooks/revenuecat.ts`. ~~*Caveat:* `registerBillingDI` is still lazy (`asFunction`)
   so config errors won't be caught by composition-root `try/catch`.~~ **Closed 2026-04-26** —
   `registerBillingDI` switched `asFunction` → `asValue`; constructor-time RevenueCat/Stripe config
   validation now eager and caught by composition-root `try/catch`. (The previously-noted
   `Environment`-enum `as any` cast was a phantom — verified 2026-04-26 that both `@t/analytics` and
   `@t/config` use the same 4-value enum.)
6. ~~Move CORS origin list to `ConfigRepository` (remove hard-coded `localhost:3000` /
   `localhost:8081` in `src/index.ts`).~~ **Done 2026-04-28** — `SystemConfigSchema.corsOrigins`
   (env `CORS_ORIGINS`, comma-separated, default `localhost:3000,8081`) and
   `SystemConfigSchema.port` (env `PORT`, default `8000`) shipped via `@t/config`;
   `apps/api/src/index.ts` reads both from DI; `.env.example` and `packages/config/README.md`
   updated.
7. ~~`@t/errors` `errorHandler` mounted via `app.onError`.~~ **Done 2026-04-26** — `src/index.ts`.
   ~~`process.on('unhandledRejection')`.~~ **Done 2026-04-26** — `src/lifecycle.ts`
   (`installProcessHandlers(container)`); registers both `unhandledRejection` and
   `uncaughtException`. ~~`RequestLogger`/`requestId` request-scope middleware so the
   analytics-capture inside `errorHandler` can fire.~~ **Done 2026-04-26** —
   `src/middleware/request-context.ts` produces `requestId` / child logger / request-scoped
   analytics on Hono context; `errorHandler` reads them via `c.get('requestId')` / `c.get('logger')`
   / `c.get('analytics')` and calls the new `RequestAnalyticsTracker.captureException(error,
   context?)` overload. ~~SIGTERM/SIGINT flush hook awaiting `OTLPWinstonTransport.shutdown()`.~~
   **Done 2026-04-26** — `src/lifecycle.ts` registers SIGTERM/SIGINT handlers that `await
   shutdownLogging()` (which awaits `OTLPWinstonTransport.shutdown()`) before `process.exit(0)`, so
   buffered PostHog logs flush on graceful termination.
8. ~~Port routers (`auth.ts`, `users.ts`, `projects.ts`) onto `ctx.db` (Drizzle-backed `DbClient`) +
   typed repositories (`UserRepository`, `EmbeddingStore`).~~ **Done 2026-04-27** — all three
   routers now use `ctx.userRepository` or `ctx.projectRepository`.
9. ~~Fix `src/routers/__tests__/users.test.ts`.~~ Tracked separately; updated as part of the 96-test
   suite.
10. ~~Migrate test harness off `bun:test` to Vitest.~~ **Done 2026-04-25.**
11. ~~Extend `/health` to probe Postgres + Redis + queue reachability.~~ **Done 2026-04-27** —
    `/health` and `/bootstrap` both perform parallel liveness pings for Postgres and Redis;
    `/health` returns 503 if either fails.
12. ~~Add queue consumer + cron entrypoints (separate Bun processes / Railway services).~~ **Done
    2026-04-28** (commit `3aa4b61`) — `apps/api/src/worker.ts` (long-running consumer, `bun run
    worker` / `bun run worker:dev`) and `apps/api/src/cron.ts` (one-shot scheduler, `bun run cron`)
    landed alongside `src/jobs/registerJobHandlers.ts` +
    `src/jobs/handlers/{ping,heartbeat}Handler.ts`. SIGTERM/SIGINT handler in `src/lifecycle.ts` now
    awaits `queue.close()` before `shutdownLogging()`. See `docs/architecture/platform/queue.md` and
    `docs/prd-status/packages/queue.md`.
13. Emit OpenAPI from `AppRouter` (e.g., `trpc-openapi`) and mount `/openapi.json`.
14. ~~Reconcile `registerAnalyticsDI` `Environment` union with `@t/config`'s `EnvironmentSchema` so the `as any` cast in `composition.ts` can be removed.~~ **PHANTOM — closed 2026-04-26.** Both packages already use `development|local|testing|production`; there was never a mismatch and there is no `as any` cast in `composition.ts`. Stale audit entry — removed.
15. ~~Add `REVENUECAT_WEBHOOK_AUTH_HEADER` to `@t/config`.~~ **Done 2026-04-26** —
    `RevenueCatConfigSchema.webhookAuthHeader`. Composition root reads
    `config.revenueCat.webhookAuthHeader` (no bare `process.env`).
16. TS5097: verified non-issue 2026-04-28. allowImportingTsExtensions is set intentionally;
    typecheck passes.
17. ~~Extract duplicated `SessionUser` type + `readBearerToken` helper from
    `apps/api/src/middleware/clerkAuth.ts` and `apps/api/src/trpc/context.ts` into a shared file.~~
    **Done 2026-04-27** (commit `1f03f158`) — shared helper landed at
    `apps/api/src/lib/auth/session.ts`; both `clerkAuth.ts` and `trpc/context.ts` import from it
    (and re-export `SessionUser` so existing test imports remain valid). `tsc --noEmit` exits 0;
    135/135 tests pass.

## Clerk

Clerk-backed `AuthProvider` from `@t/auth` is wired into `apps/api`:

- Hono `clerkAuth` middleware (`src/middleware/clerkAuth.ts`) populates `c.var.userId` /
  `c.var.user` before `/trpc/*` runs.
- `tRPC` context consumes `c.var` on the fast path; falls back to in-context Bearer verification on
  test paths that don't reach Hono.
- `POST /api/webhooks/clerk` uses svix signature verification (`svix-id` / `svix-timestamp` /
  `svix-signature` headers, `CLERK_WEBHOOK_SECRET`) and persists via `UserRepository` +
  `auth.syncFromWebhook(event)`.

Apps consuming this template wire their own Clerk SDK / credentials per project.

## Final Hono mount order (`src/index.ts`, post-2026-04-26 wiring)

```text
1. app.onError(errorHandler)                            ← @t/errors (registration; order-independent)
2. app.use('*', cors(...))                              ← CORS preflight
3. app.use('*', createRequestContextMiddleware(c))      ← NEW: requestId / logger / analytics on every request
4. app.get('/health', ...)                              ← health check (no auth)
5. app.route('/api/webhooks/clerk', ...)                ← Clerk webhook (svix signature)
   app.route('/api/webhooks/revenuecat', ...)           ← RevenueCat webhook (shared-secret)
6. app.use('/trpc/*', createClerkAuthMiddleware(c))     ← Clerk JWT scoped to /trpc/*
7. app.use('/trpc/*', trpcServer(...))                  ← tRPC receiver
```

`installProcessHandlers(container)` is called in `src/index.ts` immediately after `buildContainer()`
and outside the Hono mount sequence — it registers `process.on('unhandledRejection' |
'uncaughtException')` against the global `AnalyticsTracker`, plus SIGTERM and SIGINT handlers that
`await shutdownLogging()` (which awaits `OTLPWinstonTransport.shutdown()`) before `process.exit(0)`
so buffered PostHog logs flush on graceful termination.

## Notes for next agent

- As of 2026-04-26, `package.json` declares `@t/dependency-injection`, `@t/config`, `@t/logging`,
  `@t/cache`, `@t/auth`, `@t/analytics`, `@t/billing`, `@t/db`, `@t/errors` — full @t/* dependency
  surface declared.
- `package.json` `"test": "vitest run"`. **129/129 passing at 100% coverage** (was 96 — +33 from
  error-handling, lifecycle, and request-context middleware test files added 2026-04-26).
- `Context` interface in `trpc/context.ts` exposes `db` / `cache` / `logger` / `auth` / `analytics`
  / `requestAnalytics` / `userId` / `user`. Routers must port off the legacy supabase shape onto
  `ctx.db` once `@t/db` ships domain models.
- `adminProcedure` reads `ctx.user.role`; under Clerk, sourced from session claim
  `publicMetadata.role` via `AuthRepository`.
- Architecture source of truth: `docs/architecture/apps/api.md` and `docs/architecture/webhooks.md`
  (signature flow + idempotency).
- Mount-path convention: webhook routes are at `/api/webhooks/clerk` and `/api/webhooks/revenuecat`.
  Older docs may use the `/webhooks/*` shorthand — the on-disk path is `/api/webhooks/*`.
