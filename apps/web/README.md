# apps/web

Primary authenticated product UI for the template-repo monorepo. Next.js 15 App Router (RSC-first) with Clerk OAuth at the edge — `clerkMiddleware()` runs on every request and `<ClerkProvider>` wraps the root layout. The app has no backend of its own: all data flows through a tRPC client to `apps/api`, with Clerk JWTs forwarded as bearer tokens. Analytics ride PostHog via `@t/analytics-browser`; the billing surface is RevenueCat's web SDK (`@t/billing-browser`), with Stripe sitting behind RevenueCat as the web payment processor.

## Run it

```bash
bun run --filter @t/web dev    # standalone (needs apps/api running for tRPC calls)
bun run dev                    # full stack
```

Local URL: http://localhost:3001
Health check: http://localhost:3001/api/health

## Tech

- Next.js 15 + React 19 (App Router, RSC-first)
- Clerk (OAuth + session middleware)
- tRPC client → apps/api
- @t/analytics-browser (PostHog)
- @t/billing-browser (RevenueCat web SDK; Stripe processor behind RevenueCat)
- Tailwind v4 (CSS-first, no `tailwind.config.*`)
- Biome (lint/format), Vitest (unit), Playwright (e2e)

## Entry points

- `src/app/layout.tsx` — root layout, providers (Clerk, tRPC, analytics)
- `src/middleware.ts` — Clerk auth middleware (route matcher + protect)
- `src/app/api/health/route.ts` — health endpoint

## Configuration

Env vars: see `../../docs/reference/env-vars.md` (filtered to Web section).
App-specific .env: `./.env` (template at `./.env.example`).

`@t/config` hard-fails at boot for missing required vars — fix `.env`, never paper over with fallbacks.

## Deeper reading

- Agent rules: `./AGENTS.md`
- Platform architecture: `../../docs/architecture/platform/`
- API scope (data source): `../api/AGENTS.md`
