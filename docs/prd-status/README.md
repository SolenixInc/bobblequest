---
name: prd-status index
last_audited: 2026-04-30
last_updated_by: agent — desktop coverage doc sync (apps/desktop reached 100/100/100/100)
maintainer_contract: THIS FOLDER IS THE SINGLE SOURCE OF TRUTH FOR PACKAGE & APP BOOTSTRAP STATUS. Every agent that makes a code change to a package or app's bootstrap wiring MUST update the relevant sub-doc AND matrix.md in the same commit. Every agent that makes a high-level package/app decision MUST record it in the relevant sub-doc's "Notes for next agent" section.
---

# template-repo — Bootstrap Status (Single Source of Truth)

**Purpose.** One place to see: what the architecture docs intend, what's actually bootstrapped at
the package level, and what's wired at the app level. Replaces spelunking the repo to answer "is X
ready?"

**Scope.** High-level specs and bootstrap status only. Low-level implementation docs live in
`docs/architecture/`. This folder answers "is it done?", not "how does it work."

See [overview.md](./overview.md) for the live status diagram — single source of truth for what's
done and what's left.

## Files in this directory

| File | Role |
| --- | --- |
| [overview.md](./overview.md) | Live rich-ASCII status diagram — single source of truth for what's done |
| [matrix.md](./matrix.md) | Concern × app readiness grid (Framework, Auth, DB, etc. per app) |
| [gaps.md](./gaps.md) | Open items list + resolved changelog |
| [STATUS_TRACKING.md](./STATUS_TRACKING.md) | Wave-based execution log (W0..W7 milestones) — distinct from matrix/gaps; tracks wave-level sequencing, ownership, and progress summary |
| [ci.md](./ci.md) | CI check suite status |
| [infra.md](./infra.md) | Infra & tooling status |
| [architecture-intent.md](./architecture-intent.md) | Architecture intent extracted from docs/architecture |

Sub-folders: [apps/](./apps/) and [packages/](./packages/) hold per-surface drill-down docs.

## Living Overview Doc Contract

Whenever a sub-agent closes a checkbox in [overview.md](./overview.md), the same commit must:

1. Flip the `[ ]` to `[x]` in `overview.md` (with a `✨ landed-MM-DD` marker if recent)
2. Bump the percent + progress bar (▰▱) in the affected node
3. Mirror the same change in [matrix.md](./matrix.md) (concern × app grid)
4. Move the resolved item from [gaps.md](./gaps.md) open list into `gaps.md` Changelog (Resolved
   YYYY-MM-DD) with a one-line summary

No item is "done" until those four files agree. Drift is a blocker — treat any sub-agent that
doesn't update them as failing the dispatch contract.

## Snapshot — 2026-04-26

> **2026-04-26 — CI bundle-size budget shipped (size-limit v12).** New `size-limit` job in
> `.github/workflows/ci.yml` enforces apps/web `.next/static/**/*.js` ≤ 1800 kB (baseline 1506 kB;
> brotli 399 kB) and apps/api `dist/index.js` ≤ 4600 kB (baseline 3762 kB; brotli 517 kB), both ~20%
> over current baseline. Devdeps `size-limit ^12.1.0`, `@size-limit/preset-app ^12.0.0`,
> `@size-limit/file ^12.1.0` at root. Combined with already-shipped commit-lint, CI overall is now
> ~95%; remaining items (E2E expansion, integration test tier, knip/madge, license check, SBOM,
> stale dep report) are all genuinely deferred. **Known follow-up:** in-flight
> `packages/config/infrastructure/ConfigRepositoryImpl.ts` change introduces a `node:process`
> URI-scheme webpack error that will fail the new size-limit web step on any PR carrying it; tracked
> in [gaps.md](./gaps.md) under P1.
>
> **2026-04-26 — apps/web browser observability shipped.** `posthog-js@1.372.1` wired via Next 15
> native `instrumentation-client.ts` (one-time `posthog.init()`, `person_profiles:
> 'identified_only'`, `capture_pageview: false`, no-op when `NEXT_PUBLIC_POSTHOG_KEY` missing);
> `<PHProvider>` + `<Suspense><PostHogPageView /></Suspense>` mounted in `layout.tsx`; SPA pageviews
> via `usePathname`+`useSearchParams`; Clerk identify/reset via `useAuth`+`useUser`; `error.tsx`
> (route) + `global-error.tsx` (root, owns `<html><body>`) both call `posthog.captureException`.
> `bun run typecheck` ✅, `bun run build` ✅ (5 routes, zero warnings). **Deliberate split:** browser
> uses `posthog-js` directly, not via `@t/analytics` (posthog-node, server-only); future
> mobile/desktop will follow the same direct-SDK pattern. apps/web raised 🟡 50% → 🟡 ~68%.
>
> **2026-04-26 — `@t/errors` consumer wiring landed in apps/api; package raised 🟡 → ✅.**
> `errorHandler` rewritten to read `requestId` / `logger` / `analytics` from Hono context with
> graceful fallback (139/139 tests at 100% coverage). New
> `apps/api/src/middleware/request-context.ts` produces all three per-request via
> `crypto.randomUUID()` + child logger + `container.createScope()`; echoes `X-Request-ID`. New
> `apps/api/src/lifecycle.ts` (`installProcessHandlers(container)`) registers
> `process.on('unhandledRejection' | 'uncaughtException')` against the global
> `AnalyticsTracker.captureException(error, 'system', { source })`. New
> `RequestAnalyticsTracker.captureException(error, context?)` overload
> (`packages/analytics/src/infrastructure/RequestAnalyticsTrackerImpl.ts:54-69`) auto-fills
> distinctId from scoped user (83/83 tests at 100% cov). apps/api tests 96 → 129 (+33) at 100% cov.
> Mount order: `onError` → `cors` → `request-context` → `/health` → webhooks → `clerkAuth(/trpc/*)`
> → tRPC.
>
> **2026-04-26 — `@t/logging` raised to ✅.** Platform doc `docs/architecture/platform/logging.md`
> reconciled to the shipped Winston v3 + PostHog OTLP impl (was: pino target). `apps/api` and
> `apps/web` (server-side) composition roots both call `registerLoggerFactoryDI` +
> `registerLoggerDI`. Package name finalized as `@t/logging`. **SIGTERM/SIGINT flush hook landed in
> apps/api 2026-04-26** — `shutdownLogging` helper awaits `OTLPWinstonTransport.shutdown()` from
> `apps/api/src/lifecycle.ts` so buffered PostHog logs flush before exit. Remaining open:
> `apps/{website,mobile,desktop}` composition roots and the browser/RN logging adapter (winston is
> server-only).
>
> **2026-04-26 — apps/api integration shipped (clerkAuth + both webhooks + errorHandler).**
> `createClerkAuthMiddleware(container)` mounted at `/trpc/*` in `src/index.ts` (order:
> `onError(errorHandler)` → CORS → `/health` → `/api/webhooks/clerk` + `/api/webhooks/revenuecat` →
> `clerkAuth(/trpc/*)` → tRPC). `POST /api/webhooks/clerk` ships svix verification (kept svix
> directly, not `@clerk/backend/webhooks`) + `UserRepository` create/update/delete +
> `auth.syncFromWebhook`. `POST /api/webhooks/revenuecat` ships timing-safe shared-secret verify
> (`config.revenueCat.webhookAuthHeader`) + dispatch to `BillingRepository.handleRevenueCatEvent`.
> `@t/errors` `errorHandler` mounted via `app.onError`. 96/96 tests at 100% coverage. apps/api Auth
> / Errors / Billing-webhook cells all ✅. `@t/auth` package raised 🟡 50% → 🟡 ~75% (mobile + desktop
> wiring still gates 🟢). DB migration `users.clerk_user_id` confirmed in
> `packages/db/migrations/0001_init_schema.sql`.
>
> **2026-04-26 — DI package flipped to 🟢.** Platform doc expanded to canonical reference; package
> README created; token snapshot test added (`dependencyKeys.test.ts`); cross-references reconciled
> across prd-status.
>
> **2026-04-26 — `@t/config` cleanup shipped.** `GCPConfigSchema` deleted; `mongoUri` / `K_SERVICE`
> removed; `RevenueCatConfigSchema.webhookAuthHeader` added; `ConfigTypes.ts` completed; 116 tests
> at 100% coverage. `packages/config/README.md` created. No `RailwayConfigSchema` or
> `BillingConfigSchema` — coverage is complete via existing schemas.
>
> Per-axis bootstrap state. See sibling docs for drill-down: [matrix](./matrix.md) ·
> [gaps](./gaps.md) · [ci](./ci.md) · [infra](./infra.md) · [apps/](./apps/) ·
> [packages/](./packages/).

```text
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                              TEMPLATE-REPO · ARCHITECTURE STATUS · 2026-04-26                                    ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Status:  ✅ done   🟢 polish   🟡 partial   🟠 scaffold   🔴 not-started/broken                                  │
│ Markers: ✨ landed-04-25   🧩 wired-in-DI   🔥 blocker   ⚠ gap   🎯 critical                                     │
│ Bars:    ▰ filled  ▱ empty  (10-seg)        Checkbox: [x] done  [ ] open  [~] wip  [!] block                     │
│ Tokens:  ◆ singleton   ○ scoped                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

──────────────────────────────────────────────────── CLIENTS ───────────────────────────────────────────────────────

┌──────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐
│🌐 web · Next15 :3000  🟡✨│ │🌐 website · MDX :3002 ✅ │ │📱 mobile · Expo 54    🟠 │ │🖥 desktop · Electron32🟠 │
│▰▰▰▰▰▰▰▰▱▱  75%           │ │▰▰▰▰▰▰▰▰▰▰  100%          │ │▰▰▱▱▱▱▱▱▱▱  22%           │ │▰▰▰▱▱▱▱▱▱▱  25%           │
│[x] Next 15 app router    │ │[x] Next15+MDX scaffold   │ │[x] Expo SDK 54           │ │[x] Electron 32           │
│[x] Clerk provider        │ │[x] Clerk swap (N/A)        │ │[x] NativeWind            │ │[x] electron-vite         │
│[x] clerkMiddleware       │ │[x] blog FS collection       │ │[ ] Supabase ➜ Clerk      │ │[x] react-router ✅ 04-26  │
│[x] sign-in/up routes     │ │[x] shadcn install           │ │[ ] clerk-expo+secure     │ │[ ] Supabase ➜ Clerk      │
│[x] posthog-js browser ✨ │ │[x] @t/config wiring        │ │[ ] RevenueCat SDK        │ │[ ] @clerk/clerk-js       │
│[x] error.tsx ✨          │ │[x] @t/analytics wiring     │ │[ ] PostHog RN            │ │[ ] crash reporter        │
│[x] global-error.tsx ✨   │ │                          │ │[ ] push notifications    │ │[ ] Playwright e2e        │
│[ ] billing SDK           │ │                          │ │[ ] EAS profiles          │ │[ ] code-signing          │
│[x] client @t/config ✨   │ │                          │ │                          │ │                          │
└──────────────────────────┘ └──────────────────────────┘ └──────────────────────────┘ └──────────────────────────┘
              ▼                          ▼                            ▼                            ▼
─────────────────────────────────────────────────── EDGE / API ────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ apps/api · Hono+tRPC :3001                                            🟡✨   ▰▰▰▰▰▰▰▰▰▱  90%                   │
│ [x] Hono + tRPC server                              [x] composition root ✨ (129/129 tests)                      │
│ [x] DI container wired ✨                           [x] Clerk client in DI                                       │
│ [x] Hono clerkAuth middleware ✨                    [x] /api/webhooks/clerk ✨                                   │
│ [x] /api/webhooks/revenuecat ✨                     [x] errorHandler mounted ✨                                  │
│ [x] request-context middleware ✨                   [x] process.on(unhandled/uncaught) ✨                        │
│ [ ] port routers onto ctx.db                        [ ] /health probes extended                                  │
│ [ ] queue + cron entrypoints                        [ ] CORS origin → config                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                       ▼
──────────────────────────────────────────────────── DI CONTAINER ─────────────────────────────────────────────────

╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║ 💉 awilix · 10 hoisted tokens + 1 per-request scope                                                              ║
║ wired-in:  apps/api ✅✨  ·  web 🔴  ·  website 🔴  ·  mobile 🔴  ·  desktop 🔴                                  ║
║ ◆ CONFIG    ◆ LOGGER_FACTORY   ◆ LOGGER       ◆ ANALYTICS   ◆ AUTH                                               ║
║ ◆ CACHE     ◆ DB               ◆ USER_REPO    ◆ EMBED_STORE ◆ BILLING_REPO                                       ║
║ ○ REQUEST_ANALYTICS                                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
                                                       ▼
──────────────────────────────────────────────────── PACKAGES ─────────────────────────────────────────────────────

┌────────────────────────────────────┐ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│🔐 @t/auth              🟡          │ │💳 @t/billing           🟡          │ │📊 @t/analytics         🟡          │
│▰▰▰▰▰▰▰▱▱▱  75%                     │ │▰▰▰▰▰▰▱▱▱▱  65%                     │ │▰▰▰▰▰▰▰▰▱▱  85%                     │
│[x] Clerk scaffold                  │ │[x] RevenueCat port                 │ │[x] PostHog impl                    │
│[x] @clerk/backend client           │ │[x] eager asValue reg ✨            │ │[x] noop mode                       │
│[x] NoopAuthProvider                │ │[x] eager-validate config ✨        │ │[x] DI registration                 │
│[x] registerAuthDI                  │ │[x] /api/webhooks/revenuecat ✨     │ │[x] 83 tests/100% cov ✨            │
│[x] apps/api wired ✨               │ │[ ] Stripe web-only adapter         │ │[x] captureException overload ✨    │
│[x] /api/webhooks/clerk ✨          │ │                                    │ │[ ] PII scrubber                    │
└────────────────────────────────────┘ └────────────────────────────────────┘ └────────────────────────────────────┘

┌────────────────────────────────────┐ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│🪵 @t/logging           ✅✨        │ │❌ @t/errors            ✅✨        │ │⚙ @t/config             ✅✨        │
│▰▰▰▰▰▰▰▰▰▰  100% ✨                  │ │▰▰▰▰▰▰▰▰▰▰  100% ✨                  │ │▰▰▰▰▰▰▰▰▰▰  100%                    │
│[x] Winston base                    │ │[x] AppError class                  │ │[x] Zod schemas                     │
│[x] PostHog OTLP                    │ │[x] errorHandler                    │ │[x] ConfigRepository                │
│[x] redactors                       │ │[x] Zod conversion                  │ │[x] drop GCP legacy ✨              │
│[x] DI registration                 │ │[x] mounted in apps/api ✨          │ │[x] webhookAuthHeader ✨            │
│[x] structured JSON                 │ │[x] analytics capture via ctx ✨    │ │[x] 116 tests/100% cov ✨          │
│[x] platform doc reconciled ✨      │ │[x] 139 tests/100% cov ✨           │ │                                    │
└────────────────────────────────────┘ └────────────────────────────────────┘ └────────────────────────────────────┘

┌────────────────────────────────────┐ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│💉 @t/d-i               🟢          │ │💾 @t/cache              ✅           │ │🗄 @t/db                ✅✨        │
│▰▰▰▰▰▰▰▰▰▱  90%                     │ │▰▰▰▰▰▰▰▰▰▰  100%                     │ │▰▰▰▰▰▰▰▱▱▱  75%                     │
│[x] awilix container                │ │[x] Redis port                      │ │[x] Drizzle ORM                     │
│[x] 10 global tokens                │ │[x] in-memory double                │ │[x] pgvector schema                 │
│[x] registerXxxDI helpers           │ │[x] DI registration                 │ │[x] migrations defined              │
│[x] platform doc ✨                 │ │[x] wired into apps/api             │ │[x] Railway PG connection           │
│[x] README + snapshot test ✨       │ │[x] rateLimit + withCacheLock ✨    │ │[ ] live migration runs             │
│                                    │ │[x] integration tests ✨            │ │[ ] integration tests               │
└────────────────────────────────────┘ └────────────────────────────────────┘ └────────────────────────────────────┘
                                                       ▼
──────────────────────────────────────────────────── PLATFORM ─────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔐 Clerk · 💳 RevenueCat (+Stripe behind) · 📊 PostHog · 🗄 Postgres+pgvector · 💾 Redis · ☁ Railway             │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                       ▼
────────────────────────────────────────────────────── CI ─────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔧 CI · turbo-filtered                                                  overall 🟢   ▰▰▰▰▰▰▰▰▰▱  95%              │
│ [x] turbo filter on PR diff                         [x] biome lint                                               │
│ [x] biome format                                    [x] vitest enforced                                          │
│ [x] test scripts in all workspaces ✨               [x] format-check job ✨                                      │
│ [x] gitleaks secret scan ✨                         [x] concurrency cancel ✨                                    │
│ [x] coverage upload (Codecov) ✨                    [x] commit-lint ✨                                           │
│ [x] GHA cache action                                [x] size-limit budget ✨                                     │
│ [ ] E2E matrix                                      [ ] knip · madge · SBOM · license                            │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                       ▼
────────────────────────────────────────────────── CRITICAL PATH ──────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎯 P0 ▶   reconcile @template/* vs @t/* package scope                                                            │
│ 🎯 P1 ▶▶  mobile + desktop · Supabase ➜ Clerk swap                                                               │
│ 🎯 P2 ⇒   port apps/api routers onto ctx.db once @t/db ships domain repositories                                 │
│ 🎯 P3 →   browser observability for apps/{website,mobile,desktop} (mirror apps/web posthog-js pattern ✨)        │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Maintenance contract.** Every agent — automated or human — touching any code in `packages/*` or
`apps/*` bootstrap wiring MUST, in the same commit:

1. Update the relevant sub-doc (`packages/<name>.md` or `apps/<name>.md`).
2. Update the corresponding cell(s) in [matrix.md](./matrix.md).
3. Add/close items in [gaps.md](./gaps.md) when state changes.
4. Bump `last_audited` on every touched file.

Stale status is worse than no status. If you can't maintain it, don't edit the code.

## Current snapshot (abbreviated)

Legend: ✅ wired / 🟡 partial / 🔴 missing / — N/A

| Concern | pkg | api | web | website | mobile | desktop |
| --- | --- | --- | --- | --- | --- | --- |
| Framework | — | ✅ | 🟡 | ✅ | 🟡 | ✅ |
| Config | ✅ | ✅ | ✅ | ✅ | 🔴 | 🔴 |
| Logging | ✅ | ✅ | ✅ server+browser | ✅ | 🔴 | 🔴 |
| Errors | ✅ | ✅ | ✅ | ✅ | 🔴 | 🔴 |
| Auth | 🟡 75% | ✅ | ✅ | — | 🔴 | 🟡 partial |
| DB | ✅ | ✅ | — | — | — | — |
| Cache | ✅ | ✅ | — | — | — | — |
| Billing | 🟡 65% | ✅ eager | 🔴 | — | 🔴 | 🔴 |
| Analytics | ✅ types+browser | ✅ | ✅ @t/analytics-browser | ✅ | 🔴 | 🔴 |
| DI | 🟢 | ✅ | — | — | — | 🔴 |
| Tests | ✅ 100% | ✅ 100% | 🟡 | 🟡 | 🟡 | ✅ 100% (2026-04-30) |

**Headline:** All `packages/*` and `apps/api` are at 100% coverage (enforced thresholds). `@t/cache`
raised to ✅ 2026-04-26: rateLimit + withCacheLock helpers shipped, integration tests live,
railway.toml redis service declared, apps/api composition root wired (135 tests). `@t/config` fully
shipped 2026-04-26: GCP legacy purged, `webhookAuthHeader` added, 116 tests. `@t/logging` raised to
✅ 2026-04-26 with the SIGTERM/SIGINT `shutdownLogging` flush hook landing in apps/api. CI hardened
2026-04-25 (format-check, gitleaks, concurrency cancel, Codecov). apps/api composition root wired
all 10 DI tokens; Clerk auth wiring landed 2026-04-26 (clerkAuth middleware on `/trpc/*`, `POST
/api/webhooks/clerk` with svix + UserRepository persistence + auth.syncFromWebhook, `userSync`
callback in composition); RevenueCat webhook + errorHandler + lifecycle handlers (incl.
SIGTERM/SIGINT log flush) also mounted. Remaining work: port routers onto `ctx.db` once `@t/db`
ships domain repositories, CORS origin → config, `/health` extended probes, queue + cron
entrypoints, OpenAPI; apps/mobile + apps/desktop Clerk swap. apps/desktop reached 100/100/100/100
on 2026-04-30 (Vitest + jsdom + RTL covering main, preload, renderer); thresholds flip 0 → 100 in
Track D (in flight). Other client apps (apps/web, apps/website, apps/mobile) still carry 0
thresholds pending their own coverage pushes.

## Index

### Packages

- [@t/analytics](./packages/analytics.md)
- [@t/auth](./packages/auth.md) — ⚠️ provider drift (cookie-JWT code vs Clerk docs)
- [@t/billing](./packages/billing.md)
- [@t/cache](./packages/cache.md) — ✅ done: all gaps closed 2026-04-26 (helpers, integration tests,
  railway.toml redis service, apps/api wired)
- [@t/config](./packages/config.md)
- [@t/db](./packages/db.md) — scaffolded on Drizzle ORM + pgvector; wired into apps/api 2026-04-25
- [@t/dependency-injection](./packages/dependency-injection.md) — 🟢 complete: platform doc, README,
  and token snapshot test landed 2026-04-26; all 10 global tokens hoisted; resolved in apps/api
  composition root
- [@t/errors](./packages/errors.md) — errors packages: shipped 2026-04-26
- [@t/logging](./packages/logging.md) — ✅ winston-backed impl shipped; wired into apps/api
  2026-04-25 and apps/web server-side 2026-04-26; platform doc reconciled to winston 2026-04-26;
  SIGTERM/SIGINT flush hook landed in apps/api 2026-04-26. Remaining: apps/{website,mobile,desktop}
  composition roots, browser/RN adapter.

### Apps

- [apps/api](./apps/api.md)
- [apps/web](./apps/web.md)
- [apps/website](./apps/website.md)
- [apps/mobile](./apps/mobile.md)
- [apps/desktop](./apps/desktop.md)

### Cross-cutting

- [Infra & tooling](./infra.md)
- [CI check suite](./ci.md) — CI: doctor job wired for stack verification (bun run doctor --ci
  --fast)
- [Architecture intent (extracted from docs/architecture)](./architecture-intent.md)
- [Status matrix](./matrix.md)
- [Gaps & blockers](./gaps.md)
- [Verification Guide](../operations/verification.md) — how to run the stack verification pipeline

## How to update this doc set

1. Before editing, read the sub-doc(s) for the files you're about to touch.
2. Make your code change.
3. Update sub-doc status markers, evidence paths, and gap list.
4. Update matrix cell(s).
5. Commit all together. Never split.
