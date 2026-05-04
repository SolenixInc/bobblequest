# template-repo — Living Status Overview

Last updated: 2026-04-30

```text
──────────────────────────────────────── CLIENT APPS ────────────────────────────────────────

┌──────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐
│🌐 web · Next15 :3000  🟢 │ │🌐 website · MDX :3002 ✅ │ │📱 mobile · Expo54     🟡 │ │🖥 desktop · Electron32🟡 │
│▰▰▰▰▰▰▰▰▰▰ 100%           │ │▰▰▰▰▰▰▰▰▰▱  95%           │ │▰▰▰▰▰▰▰▰▱▱  80%           │ │▰▰▰▰▰▰▰▱▱▱  75% ✨        │
│[x] Clerk + middleware    │ │[x] @t/config + logger    │ │[x] Clerk + Apple SignIn  │ │[x] Clerk renderer wired  │
│[x] AnalyticsProvider     │ │[x] FS-driven MDX 3 posts │ │[x] RevenueCat RN + UI    │ │[x] RevenueCat Web SDK    │
│[x] error.tsx + global    │ │[x] PostHog client + bdry │ │[x] PostHog RN + bridge   │ │[x] Main DI + Logger      │
│[x] @t/billing-browser    │ │[x] /api/health + railway │ │[x] @t/logging-rn console │ │[x] ErrorBoundary + main  │
│[x] /pricing + dashboard  │ │[x] sitemap + JSON-LD     │ │[x] +error.tsx route      │ │[x] DesktopConfig zod     │
│[x] usePageView + clerk   │ │[x] shadcn 5 primitives   │ │[x] composition.ts (DI)   │ │[ ] crash reporter        │
│[x] e2e (home + auth)     │ │[~] @t/analytics server   │ │[ ] expo-notifications    │ │[ ] renderer Zod config   │
│[!] webpack node:process🔥│ │[ ] platform SDK copilot  │ │[ ] Google native SignIn  │ │[ ] @t/analytics renderer │
│    on size-limit build   │ │                          │ │[ ] eas.json + profiles   │ │[ ] Playwright _electron  │
│                          │ │                          │ │[ ] Detox/Maestro e2e     │ │[ ] auto-update + signing │
└──────────────────────────┘ └──────────────────────────┘ └──────────────────────────┘ └──────────────────────────┘
              ▼                          ▼                            ▼                            ▼
─────────────────────────── EDGE · apps/api · Bun + Hono + tRPC :3001 ───────────────────────────

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ apps/api                                                                          🟢  ▰▰▰▰▰▰▰▰▰▱  95%         │
│ [x] composition.ts ◆ 10 DI tokens resolve   [x] /webhooks/clerk (svix verify + UserRepo + syncFromWebhook)      │
│ [x] clerkAuth middleware on /trpc/*  🧩     [x] /webhooks/revenuecat (shared-secret + handleRevenueCatEvent)    │
│ [x] errorHandler + request-context (○)      [x] /health + /bootstrap probe Postgres + Redis (503 if down)      │
│ [x] SIGTERM/SIGINT flush PostHog logs       [x] auth/users/projects routers ported onto ctx.db (2026-04-27)    │
│ [x] tests 129/129 · 100% stmt/branch/fn/ln  [x] 9 @t/* imports wired   [x] CORS+port now via ConfigRepository ✨│
│ [ ] queue + cron entrypoints (sep services)   [ ] OpenAPI emit from AppRouter   [ ] TS5097 ts-extensions cleanup│
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                          ▼
─────────────────────────────── PLATFORM PACKAGES (@t/*) · 17 modules ───────────────────────────────

┌────────────────────────────────────┐ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ ⚙ @t/config                  ✅    │ │ 🪵 @t/logging  (server)        ✅  │ │ ❌ @t/errors                   ✅  │
│ ▰▰▰▰▰▰▰▰▰▰ 100%   116 tests        │ │ ▰▰▰▰▰▰▰▰▰▰ 100%   winston v3       │ │ ▰▰▰▰▰▰▰▰▰▰ 100%   139 tests        │
│ [x] ConfigRepository + 13 schemas  │ │ [x] OTLP PostHog transport         │ │ [x] typed error classes            │
│ [x] zod-validated env per subsys   │ │ [x] SIGTERM flush hook             │ │ [x] Hono errorHandler delivery     │
│ [x] consumed by api/web/desktop    │ │ [x] api + web composition wired    │ │ [x] request-context middleware     │
│ [x] gcp/auth0 schemas dropped      │ │ [ ] website/mobile/desktop comp.   │ │ [x] analytics captureException     │
└────────────────────────────────────┘ └────────────────────────────────────┘ └────────────────────────────────────┘

┌────────────────────────────────────┐ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ 💉 @t/dependency-injection   🟢    │ │ 🗄 @t/db                       ✅  │ │ 💾 @t/cache                    ✅  │
│ ▰▰▰▰▰▰▰▰▰▱  90%   awilix + tokens  │ │ ▰▰▰▰▰▰▰▰▰▰ 100%   drizzle+pgvec    │ │ ▰▰▰▰▰▰▰▰▰▰ 100%   135 tests        │
│ [x] 10 global + 1 request token    │ │ [x] PostgresClient + VectorQuery   │ │ [x] Redis + InMemory fallback      │
│ [x] dependencyKeys + lifetimeCfg   │ │ [x] migration tool verified        │ │ [x] rateLimit + withCacheLock      │
│ [x] platform doc + token snapshot  │ │ [x] 73 unit + 20 integration tests │ │ [x] integration tests + compose    │
│ [ ] composition root in web/mob/dt │ │ [x] api routers ported to ctx.db   │ │ [ ] CI service container for Redis │
└────────────────────────────────────┘ └────────────────────────────────────┘ └────────────────────────────────────┘

┌────────────────────────────────────┐ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ 🔐 @t/auth (Clerk)           🟡    │ │ 📊 @t/analytics  (server)      ✅  │ │ 💳 @t/billing                  🟡  │
│ ▰▰▰▰▰▰▰▱▱▱  75%   ~75% adoption    │ │ ▰▰▰▰▰▰▰▰▰▰ 100%   83 tests         │ │ ▰▰▰▰▰▰▱▱▱▱  60%   eager DI ✨      │
│ [x] AuthRepo + ClerkAuth + InMem   │ │ [x] PostHogTracker + NoOp + scrub  │ │ [x] RevenueCat primary impl        │
│ [x] api middleware + webhook       │ │ [x] dependencyKeys.global.ANALYTICS│ │ [x] RC webhook + signature verify  │
│ [x] web + desktop renderer wired   │ │ [x] api per-request scope ○        │ │ [~] persistence stub (no idemp tbl)│
│ [x] mobile @clerk/clerk-expo       │ │ [x] reserved super-properties      │ │ [ ] Stripe→RC collapse (scaffolds) │
│ [ ] mobile Google SignIn           │ │ [x] all 5 apps consume             │ │ [ ] tRPC billing.* routers         │
└────────────────────────────────────┘ └────────────────────────────────────┘ └────────────────────────────────────┘

────────────────────────── PORT-AND-IMPL SPLIT (cross-platform shards · ADR-0001) ──────────────────────────

┌────────────────────────────────────┐ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ 📦 *-types  (zero-runtime ports) ✅│ │ 📦 *-browser  (web)            ✅  │ │ 📦 *-rn       (React Native)   🟡  │
│ ▰▰▰▰▰▰▰▰▰▰ 100%                    │ │ ▰▰▰▰▰▰▰▰▰▰  95%                    │ │ ▰▰▰▰▰▰▰▱▱▱  70%                    │
│ [x] @t/analytics-types             │ │ [x] @t/analytics-browser ✨        │ │ [x] @t/analytics-rn (71 tests)     │
│ [x] @t/logging-types               │ │ [x] @t/logging-browser             │ │ [x] @t/logging-rn (61 tests)       │
│ [x] consumed by all 3 platforms    │ │ [x] @t/billing-browser (RC web)    │ │ [ ] consumed by mobile composition │
│                                    │ │ [ ] billing DI register + tests    │ │ [ ] PostHog self-host deploy guide │
└────────────────────────────────────┘ └────────────────────────────────────┘ └────────────────────────────────────┘

                                                          ▼
──────────────────────────── INFRA · CI · BUILD GRAPH · TOOLCHAIN ────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔧 CI Suite                                                                          🟢  ▰▰▰▰▰▰▰▰▰▱  95%         │
│ Pins: Bun 1.3.11 · Turbo ^2 · Biome ^1.9 · lefthook 2.1.6 · size-limit v12 · @clerk/* · drizzle · vitest        │
│ FAST   [x] biome format-check · [x] biome check · [x] commitlint · [x] gitleaks · [x] bun.lock integrity        │
│ CORE   [x] turbo typecheck · [x] turbo test (cov) · [x] turbo build · [ ] integration · [ ] knip · [ ] madge    │
│ FULL   [x] playwright web+website · [ ] e2e mobile (Detox/Maestro) · [ ] e2e desktop (_electron)                │
│ HYG    [x] bun audit · [x] size-limit  web≤1800kB  api≤4600kB · [ ] license check · [ ] SBOM · [ ] stale deps   │
│ EXTRA  [x] Postgres pgvector service in CI ✨ · [x] remote turbo cache · [x] concurrency cancel-in-progress     │
│        [x] pre-commit gate mirrors fast tier (lefthook v2.1.6) · [ ] CI Redis service container · [ ] OS matrix │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                          ▼
──────────────────────────────────── ☁ RAILWAY RUNTIME (deploy targets) ────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ☁ Railway provisioning                                                              🟠  ▰▰▰▱▱▱▱▱▱▱  30%         │
│ [x] railway.toml declares api / web / website + redis block   [x] /api/health probes wired in 3 services       │
│ [ ] postgres service runtime-provisioned (declared, not created)   [ ] redis runtime-provisioned (declared)    │
│ [ ] worker services for queue consumers   [ ] cron jobs declared   [ ] storage bucket + signed-URL helper      │
│ [ ] Railway repo-watch + auto-deploy on push to main per service   [ ] Railway PR Environments enabled         │
│ [ ] per-environment secrets (development / production · staging dropped 2026-04-26)                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

═════════════════════════════════════ 🎯 WHAT'S LEFT BEFORE USE ═════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎯 P0 ✅  ALL CLOSED   auth provider · db strategy · @t/* package naming                                        │
│ 🎯 P1 🟡  ▶  webpack `node:process` URI on apps/web build (size-limit fails until ConfigRepositoryImpl refactor)│
│            ▶  pre-existing TS5097 (allowImportingTsExtensions) on @t/analytics + @t/auth + @t/logging           │
│ 🎯 P2 🟡  ▶▶ MOBILE   expo-notifications · Google native SignIn · eas.json profiles · Detox/Maestro e2e         │
│            ▶▶ DESKTOP  crash reporter · renderer Zod config + DI · @t/analytics renderer · _electron e2e        │
│            ▶▶ DESKTOP  electron-updater + code-signing (mac.identity / win.certificateFile / notarize)          │
│            ▶▶ API      queue + cron entrypoints (separate Bun processes) · OpenAPI from AppRouter               │
│            ▶▶ BILLING  persistence with idempotency table · Stripe→RevenueCat collapse · tRPC billing.* routers │
│ 🎯 P3 🟠  ⇒  RAILWAY  provision Postgres + Redis · repo-watch + auto-deploy · PR Environments · workers         │
│            ⇒  CI       integration test tier · OS matrix (win+mac) · knip · madge · license check · SBOM       │
│            ⇒  POLISH   pin Bun via .tool-versions (4 hardcodes) · turbo globalDependencies for non-local .env   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════ READINESS BY USE-CASE ════════════════════════════════════════

  Scaffold-as-template (clone & wire env vars)         ▰▰▰▰▰▰▰▰▰▱  90%   ✅ READY — apps/web + apps/api are turn-key
  Local full-stack dev (compose up + bun stack:full)   ▰▰▰▰▰▰▰▰▰▱  90%   ✅ READY — Postgres+Redis via docker-compose
  Mobile shipping to App/Play Store                    ▰▰▰▰▰▰▰▱▱▱  70%   🟡 BLOCKED — eas.json + push + Google SSO
  Desktop shipping signed installers                   ▰▰▰▰▰▰▱▱▱▱  60%   🟡 BLOCKED — code-signing + auto-update
  Production deploy on Railway                         ▰▰▰▱▱▱▱▱▱▱  30%   🟠 BLOCKED — runtime provisioning + repo-watch

Bottom line. Server-side foundation (apps/api + apps/web + apps/website + every @t/* server package) is essentially turn-key — clone, wire env, ship. The unfinished surface area is concentrated in three buckets: (1) mobile/desktop store-ready polish (push, Google SSO, EAS, code-signing, auto-update), (2) billing depth (idempotency, Stripe collapse, tRPC routers), (3) Railway runtime + repo-watch deploy (services declared but not provisioned, no PR Environments). Two niggles still on P1: a webpack node:process build break on apps/web and pre-existing TS5097 errors across three packages.
```

## Living Overview Doc Contract

Whenever a sub-agent closes a checkbox in [overview.md](./overview.md), the same commit must:

1. Flip the `[ ]` to `[x]` in `overview.md` (with a `✨ landed-MM-DD` marker if recent)
2. Bump the percent + progress bar (▰▱) in the affected node
3. Mirror the same change in [matrix.md](./matrix.md) (concern × app grid)
4. Move the resolved item from [gaps.md](./gaps.md) open list into `gaps.md` Changelog (Resolved
   YYYY-MM-DD) with a one-line summary

No item is "done" until those four files agree. Drift is a blocker — treat any sub-agent that
doesn't update them as failing the dispatch contract.
