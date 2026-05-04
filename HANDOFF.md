# Session Handoff — template-repo

_Written 2026-04-15, updated 2026-04-19. Give this entire file to a fresh agent session._

---

## What This Repo Is

A **monorepo template** for bootstrapping full-product SaaS applications. The vision: one repo, one
product, every surface — backend, web app, marketing website, mobile app, and desktop app. When
someone starts a new product, they clone this template and have the entire stack ready to go.

**Owner:** Jager (jagerdcooper@gmail.com)
**Location:** `C:\Users\jager\OneDrive\Documents\GitHub\template-repo`

---

## Current State: Phase 3 In Flight

Phase 1-2 are fully landed and passing lint + typecheck. Phase 3 scaffolding is underway, not
pending.

| Plan | Status | Evidence |
| --- | --- | --- |
| 01 Workspace Foundation | Done | `package.json`, `turbo.json`, `tsconfig.base.json`, `biome.json`, `bunfig.toml`, `.gitignore`, workspaces wired, `packageManager` set |
| 02 Shared Packages | Done | `packages/config` + `packages/db` landed; `ai`/`billing`/`notifications` sourced from Platform SDK (see below) |
| 03 Database Setup | Done | `packages/db/drizzle.config.ts`, generated migrations, `packages/db/src/{client,index,schema,seed}.ts` |
| 04 tRPC Backend | Done | `apps/api/src/{index.ts, trpc/{context,index}.ts, routers/{index,auth,users,projects}.ts}` |
| 05 Authentication | Done | `apps/web/src/{middleware.ts, lib/clerk/{client,server}.ts}` (Clerk) |
| 06 Next.js Web App | In Flight | Bootstrap route scaffolded; Shadcn primitives wired; pricing paywall with @t/billing-browser; dashboard e2e tests added |
| 08 React Native Mobile | In Flight | Expo + Clerk (`@clerk/clerk-expo`) + SecureStore wired; native auth token caching dropped for built-in Clerk; bootstrap route added |
| 15 Marketing Website | In Flight | Shadcn primitives installed and build-fixed; bootstrap route added |
| 16 Electron Desktop | In Flight | Electron-vite scaffolded; config + DI composition root with @t/config; typed IPC via contextBridge; RC Web SDK paywall wired; bootstrap route added |

**Quality gates as of 2026-04-27:** `bun run lint`, `bun run check`, `bun run typecheck` pass across
all packages and apps with test scripts. Test runner is Vitest (not `bun:test`). Pre-commit lefthook
gates mirror CI fast tier.

**Per-package PRD docs:** Partially written. `packages/logging-browser`,
`packages/analytics-browser`, `packages/billing-browser`, `packages/cache`, `packages/logging-rn`,
`packages/config` have READMEs. Remaining packages need their PRDs.

**Active work this session:** Audit/fix pass on agent infrastructure (rule deduplication, README
index regen, HANDOFF/AGENTS.md updates, UTF-8 mojibake fix), desktop bootstrap completion, mobile
Clerk swap, CI wiring.

---

## Tech Stack (Decided)

| Layer | Technology |
| --- | --- |
| **Runtime** | Bun (package manager, bundler, test runner, runtime) |
| **Language** | TypeScript (strict mode everywhere) |
| **Monorepo** | Bun workspaces + Turborepo |
| **Linting/Formatting** | Biome (replaces ESLint + Prettier) |
| **API** | tRPC + Hono (type-safe internal API) |
| **Database** | Postgres via Drizzle ORM (type-safe schema, generated migrations) |
| **Web App** | Next.js 15 (App Router, RSC) — authenticated product UI |
| **Marketing Website** | Next.js 15 (App Router) — SEO, blog/MDX, pricing, landing pages |
| **Mobile** | React Native + Expo (Expo Router, NativeWind) |
| **Desktop** | Electron (electron-vite, electron-builder) |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **State** | Zustand (client) + TanStack Query (server, via tRPC) |
| **Validation** | Zod (everywhere, pairs with tRPC) |
| **Auth** | Clerk (`@clerk/nextjs` for web, `@clerk/clerk-expo` for mobile, Clerk JWT for desktop) |
| **Analytics** | PostHog (all products: analytics, flags, replay, errors, surveys, LLM obs) |
| **Payments** | RevenueCat — primary billing layer across every app (web, mobile, desktop); Stripe sits behind RevenueCat as the web payment processor only |
| **Email** | Resend + React Email |
| **AI** | OpenRouter (LLM gateway) + Vercel AI SDK + Gemini embeddings + pgvector |
| **Hosting** | Railway (PaaS, auto-deploy on push) |
| **CDN/Security** | Cloudflare (free tier) |
| **CI/CD** | GitHub Actions (lint, typecheck, test, deploy) |
| **Versioning** | Changesets |

---

## The 5 Apps

| App | Path | Framework | Port | Purpose |
| --- | --- | --- | --- | --- |
| **API** | `apps/api` | tRPC + Hono | 3001 | Backend API server |
| **Web App** | `apps/web` | Next.js (App Router) | 3000 | Authenticated product UI (dashboard, features) |
| **Website** | `apps/website` | Next.js (App Router) | 3002 | Marketing site, blog/MDX, SEO, pricing, changelog, docs |
| **Mobile** | `apps/mobile` | Expo + React Native | 8081 | iOS/Android app |
| **Desktop** | `apps/desktop` | Electron (electron-vite) | — | Cross-platform desktop app |

Key distinction: **web** = the product (behind auth). **website** = public-facing marketing/content.

---

## Shared Packages (owned by this template)

| Package | Path | Purpose |
| --- | --- | --- |
| `@t/config` | `packages/config` | Shared Biome, Tailwind (design tokens/colors/radii), TypeScript configs |
| `@t/db` | `packages/db` | Drizzle ORM client, schema, migrations, Zod schemas |

### Sourced from Platform SDK (not built here)

The following modules ship from the **Platform SDK** (`@nutraforgetechnologies/platform`) and are
consumed via npm. Apps in this template leave `// TODO: import from @nutraforgetechnologies/<name>`
comments at integration sites.

| Module | Consumer import | Purpose |
| --- | --- | --- |
| AI | `@nutraforgetechnologies/ai` | OpenRouter client, embeddings, tools, observability |
| Billing | `@nutraforgetechnologies/billing` | RevenueCat entitlements, server-side verification |
| Notifications | `@nutraforgetechnologies/notifications` | Resend / React Email templates, multi-channel delivery |

---

## Decision: No Shared UI Package (`packages/ui` is REMOVED)

The plans include a `packages/ui` (shadcn/ui shared component library). **This has been decided
against.** Each app owns its own UI components.

**Why:**

1. **Incompatible render targets.** shadcn/ui components are React DOM (`<div>`, `<button>`). Mobile
   (React Native) uses completely different primitives (`<View>`, `<Text>`, `<Pressable>`). A shared
   package can never span both.

2. **Even among DOM apps, needs diverge fast.** The product web app gets complex interactive
   components. The marketing website gets landing page sections and blog layouts. Desktop may just
   wrap the web app in a BrowserWindow. Forcing them to share components adds coupling for marginal
   benefit.

3. **shadcn is designed to be copy-pasted, not abstracted.** The entire point of shadcn/ui is that
   you own the code. Running `bunx shadcn add button` in each app takes seconds and gives each app
   full control to customize.

4. **The shared package has real maintenance cost.** Its own `package.json`, `tsconfig`,
   `tailwind.config`, `components.json`, export map, Tailwind content path wiring in every consumer.
   All to share files that are trivial to scaffold per-app.

**What IS shared:** Design tokens (colors, border radii, spacing, typography) live in
`packages/config/tailwind.config.ts`. Every app extends this config, so they all *look* consistent
without sharing *components*.

**What was done to the plans (completed 2026-04-15):**
- **Plan 07 (Shared UI) was deleted entirely.** Design tokens are shared via
  `packages/config/tailwind.config.ts`.
- **Plans 01, 02, 14, 15, 16** had all `@t/ui` / `packages/ui` references removed.
- **Plan 06** was verified — already uses correct local `@/components/ui/` pattern, no changes
  needed.
- **Plan 08** (mobile) is unaffected — it already builds its own components with NativeWind.

---

## Known Issues & Inconsistencies in the Plans — ALL RESOLVED

All 9 known issues were resolved on 2026-04-15:

1. **`packages/ui` removed from plans** — RESOLVED. Removed all `@t/ui` / `packages/ui` references
   from plans 01, 02, 14, 15, 16. Deleted plan 07 entirely. Plan 06 verified correct (already uses
   local `@/components/ui/`).

2. **ORM stack locked on Drizzle** — RESOLVED. The template standardizes on Drizzle ORM across plans
   08, 10, 12 (previous Supabase-JS-client experiment reverted on the `feat/auth-stack-migration`
   branch).

3. **`@t/types` replaced** — RESOLVED. Replaced `@t/types` with `@t/db` in plans 08, 10, 11. Types
   come from the Drizzle schema and Zod schemas in `packages/db`.

4. **Plans 15 and 16 consistency** — RESOLVED. Reviewed and fixed as part of issue 1 (ui references
   removed).

5. **`plans/` dir shipping** — NOTED. Meta concern for build phase — plans should not ship in the
   final template. To be handled when scaffolding is complete.

6. **NativeWind Tailwind v3** — RESOLVED. Confirmed correct as-is. NativeWind requires Tailwind v3;
   this is not an inconsistency but an intentional divergence for mobile.

7. **Railway config format** — RESOLVED. Reviewed `railway.toml` format in plan 13 — confirmed
   correct.

8. **Website missing from infrastructure/CI plans** — RESOLVED. Added website service to plans 13
   (Railway config) and 14 (Dockerfile, docker-compose, CI pipeline).

9. **Desktop architecture decided** — RESOLVED. Decision: standalone Electron + local React/shadcn
   renderer, NOT a thin web wrapper. User explicitly wants desktop to feel native, not like a PWA.

---

## Known Gaps

None. Plan 02 scope mismatch was resolved on 2026-04-19 — `ai`/`billing`/`notifications` were moved
out of this template and into the Platform SDK (ClickUp `868jaet30`). See "Shared Packages" above.

---

## Plan Execution Order

```text
Phase 1 — Foundation
  01 Workspace Foundation
  02 Shared Packages

Phase 2 — Core Backend
  03 Database Setup
  04 tRPC Backend
  05 Authentication

Phase 3 — Frontends (parallelizable after Phase 2)
  06 Next.js Web App (product)
  08 React Native Mobile
  15 Marketing Website
  16 Electron Desktop

Phase 4 — Integrations (parallelizable)
  09 PostHog Analytics
  10 Payments & Billing
  11 AI Stack
  12 Communications (Email)

Phase 5 — Ship It
  13 Infrastructure (Railway + Cloudflare)
  14 Docker & CI/CD
```

---

## What the Next Session Should Do

Phase 3 scaffolding is in flight. Pick up where this session left off:

1. **Finish per-app PRDs** — write READMEs for packages still lacking them (`packages/analytics`,
   `packages/auth`, `packages/billing`, `packages/cache`, `packages/db`,
   `packages/dependency-injection`, `packages/errors`, `packages/logging`) and any apps without full
   PRD docs.
2. **Wire bootstrap routes to runtime config** — the bootstrap routes
   (`apps/api/src/routes/bootstrap.ts`, `apps/web/src/app/bootstrap/`,
   `apps/website/src/app/bootstrap/`, `apps/mobile/app/bootstrap.tsx`,
   `apps/desktop/src/renderer/routes/`) are scaffolded but not yet wired to actual `@t/config`
   runtime checks. Connect them so each app reports real config and build metadata at boot.
3. **Complete app-specific handoffs** — desktop (Electron IPC contract, renderer routes, paywall
   wiring), mobile (Clerk token flow, RC Web SDK integration, analytics wiring), web (dashboard
   routes, billing components, auth guards), website (marketing pages, pricing route).
4. **Continue audit/fix pass** — any remaining lint/typecheck/test gaps surfaced by `bun run check`,
   `bun run typecheck`, `turbo run test`.
5. **Quality gates** — `bun run lint`, `bun run check`, `bun run typecheck` after every substantive
   change.

---

## Completed Work

### 2026-04-19 — Plan 02 Rescope
- Narrowed `plans/02-shared-packages.md` to `config` + `db` only; added "Related packages (built in Platform SDK, not here)" note pointing at `@nutraforgetechnologies/ai|billing|notifications`
- Updated this HANDOFF.md: shared-packages table now lists only the two template-owned packages,
  with a separate "Sourced from Platform SDK" table for the SDK modules; Plan 02 status flipped from
  Partial → Done; Known Gap cleared
- Decision locked: template apps leave `// TODO: import from @nutraforgetechnologies/<name>`
  comments at integration sites instead of creating local packages (tracked on ClickUp epic
  `868jajt0k`, template task `868jajt54`, Platform SDK task `868jaet30`)

### 2026-04-16 — Phase 1-2 Implementation
- **Plan 01** committed (`dcd78ca`): workspace foundation — package.json, turbo.json,
  tsconfig.base.json, biome.json, bunfig.toml, .gitignore, bun.lock
- **Plan 02 (partial)** committed (`b6f42aa`): `packages/config` (biome, tailwind, tsconfig presets)
  and `packages/db` stub. `ai`/`billing`/`email` packages NOT scaffolded
- **Plan 03** committed (`978ff00`): Database layer — Drizzle ORM client, schema, seed, generated
  migrations (initial schema, user sync, application-layer authorization)
- **Plan 04** committed (`b9f2cf7`): tRPC + Hono API server — context, base router,
  auth/users/projects routers
- **Plan 05** committed (`4fdfc0a`): Clerk Auth — Next.js middleware, server/client helpers
- **Tooling fixes**: added `packageManager` field (turbo unblocked), gitignored `*.tsbuildinfo`,
  removed broken placeholder test script in `apps/api`, added `typecheck` turbo task running `tsc
  --noEmit` per workspace

### 2026-04-15 — Plan Cleanup Session
- All 9 known plan issues resolved (see "Known Issues" section above)
- Plan 07 (Shared UI) deleted — shadcn is per-app, design tokens shared via
  `packages/config/tailwind.config.ts`
- ORM stack consolidated on Drizzle across plans 08, 10, 12
- `@t/types` references replaced with `@t/db` across plans 08, 10, 11
- Website service added to infrastructure (plan 13) and CI/CD (plan 14)

### CONVENTIONS.md Created
- Coding conventions captured from NutraForge Platform (`@nutraforgetechnologies/platform`) rules
- Adapted to the template's stack (Bun, Biome, Clerk, Drizzle, tRPC, etc.)
- Defines naming, file structure, error handling, testing, and import conventions

### Design Decisions Locked
| Decision | Choice | Rationale |
| --- | --- | --- |
| Shared UI package | Dropped | shadcn is copy-paste by design; render targets incompatible across apps |
| Design token sharing | `packages/config/tailwind.config.ts` | All apps extend shared theme for visual consistency |
| Desktop architecture | Standalone Electron + local React/shadcn | User wants native feel, not a PWA wrapper |
| ORM | Drizzle ORM | Type-safe schema as single source of truth; generated migrations; no vendor lock-in |
| Auth provider | Clerk | First-class SDKs across web/mobile/desktop; managed UX; replaces Supabase Auth |
| Mobile Tailwind version | v3 (NativeWind requirement) | Intentional divergence; NativeWind does not support v4 |

---

## File Locations

| What | Path |
| --- | --- |
| Plans (source of truth) | `plans/01-*.md` through `plans/16-*.md` (plan 07 deleted, 15 remain) |
| Coding conventions | `CONVENTIONS.md` |
| PDF blueprints | `docs/artifacts/*.pdf` |
| This handoff | `HANDOFF.md` |
| Global agent config | `~/.agents/AGENTS.md` |
| Memory (project context) | `~/.claude/projects/C--Users-jager/memory/project_template_repo_stack.md` |
