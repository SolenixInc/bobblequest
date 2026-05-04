---
name: apps/web bootstrap status
last_audited: 2026-04-27
maintainer_contract: any agent editing apps/web/** MUST update this file and docs/prd-status/matrix.md
---

# apps/web — bootstrap wiring status

Framework: Next.js 15 App Router (React 19, Tailwind v4, tRPC 11)
**Completion:** 🟢 100% (2026-04-26 closeout)

## Browser Observability (2026-04-26)

Browser observability is now wired via `@t/analytics-browser` and `@t/logging-browser`, following
ADR-0001 convention: port lives in `-types`, server impl in base package, browser impl in `-browser`
package. Same `AnalyticsTracker` port surface; different SDK (`posthog-js` instead of direct
import).

- `instrumentation-client.ts` — calls `initAnalytics()` from `@t/analytics-browser` (module-level
  singleton)
- `src/app/layout.tsx` — wraps `<AnalyticsProvider>` from `@t/analytics-browser` around the app
- `src/app/_components/posthog-page-view.tsx` — replaced with `usePageView()` from
  `@t/analytics-browser`; Clerk bridge via `<ClerkAnalyticsBridge />`
- `src/app/error.tsx` — replaced `posthog.captureException()` with
  `useAnalytics().captureException()`
- `src/app/global-error.tsx` — replaced direct `posthog.captureException()` with
  `getAnalytics().captureException()`
- `src/lib/trpc/provider.tsx` — logging via `getLogger()` from `@t/logging-browser` (optional;
  errors still route to analytics)
- `next.config.mjs` — added `@t/analytics-browser`, `@t/analytics-types`, `@t/logging-browser`,
  `@t/logging-types` to `transpilePackages`
- `package.json` — removed direct `posthog-js` dep; added `@t/analytics-browser`,
  `@t/logging-browser` workspace deps

## Entry points

- `instrumentation-client.ts` — calls `initAnalytics()` from `@t/analytics-browser` (hardcoded:
  `defaults: 2026-01-30`, `capture_pageview: false`, `person_profiles: identified_only`)
- `src/app/layout.tsx` — RSC root; wraps `<AnalyticsProvider>` (from `@t/analytics-browser`) and
  `<ClerkProvider>` around app; server-side `logger` from `@t/logging` emits `web boot` log
- `src/app/_components/posthog-page-view.tsx` — `use client` component using `usePageView()` hook +
  `<ClerkAnalyticsBridge />` from `@t/analytics-browser`
- `src/app/error.tsx` — `use client` route-level error; calls
  `useAnalytics().captureException(error)`
- `src/app/global-error.tsx` — `use client` root error; owns `<html><body>`; calls
  `getAnalytics().captureException(error)`
- `src/app/page.tsx` — public home with links to `/sign-in` and `/dashboard`
- `src/app/sign-in/[[...sign-in]]/page.tsx` — Clerk `<SignIn />` catch-all
- `src/app/sign-up/[[...sign-up]]/page.tsx` — Clerk `<SignUp />` catch-all
- `src/app/dashboard/page.tsx` — RSC; server `auth()` from `@clerk/nextjs`
- `src/middleware.ts` — `clerkMiddleware()` from `@clerk/nextjs/server`
- `src/lib/composition.ts` — server-only DI container via `WebConfigValuesSchema`
- `e2e/home.spec.ts` — title smoke test
- `e2e/auth-routes.spec.ts` — auth route tests
- `.env.example` — `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (unchanged)

## @t/* imports (as of 2026-04-26)

- `@t/analytics-browser` — browser observability (new, 2026-04-26)
- `@t/analytics-types` — port + types only (new, 2026-04-26)
- `@t/analytics` — server-only, imported server-side only
- `@t/logging-browser` — browser logging (new, 2026-04-26)
- `@t/logging-types` — port + types only (new, 2026-04-26)
- `@t/logging` — server-only, imported server-side only
- `@t/billing-browser` — browser billing via RevenueCat Web SDK + NoOp fallback (new, 2026-04-26)
- `@t/config`, `@t/dependency-injection`, `@t/errors` — server-side
- `@t/api` — type-only (AppRouter)

## Wiring checklist

| Concern | Status | Evidence |
| --- | --- | --- |
| Browser analytics | ✅ wired | `@t/analytics-browser` via `initAnalytics()` + `<AnalyticsProvider>` + `useAnalytics()` hooks |
| Browser logging | ✅ wired | `@t/logging-browser` via `getLogger()` (optional; errors route via analytics) |
| Error boundaries | ✅ wired | `error.tsx` + `global-error.tsx` call `getAnalytics().captureException()` |
| PageView tracking | ✅ wired | `usePageView()` hook from `@t/analytics-browser` + `<ClerkAnalyticsBridge />` |
| Clerk identity | ✅ wired | `<ClerkAnalyticsBridge />` component + `useAuth()` / `useUser()` integration |
| Server analytics | ✅ wired | `@t/analytics` resolved in `composition.ts` for server-side tracking |
| Server logging | ✅ wired | `@t/logging` resolved in `composition.ts` for server-side logging |
| Auth | ✅ wired | `<ClerkProvider>` + `clerkMiddleware()` + sign-in/up catch-alls |
| Config | ✅ wired | `WebClientConfigSchema` in `@t/config` validates all `NEXT_PUBLIC_*` vars at the edge; server: `@t/config` composite via composition root. |
| Billing SDK | ✅ wired | `@t/billing-browser` wraps RevenueCat Web SDK behind `BillingTracker` port; NoOp fallback when `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY` absent; `<AppBillingProvider>` in layout; `<DashboardSubscriptionStatus>` on `/dashboard`; `/pricing` paywall route wired (commit `5ec3157`). Stripe is server-only behind `CompositeBillingImpl` in `@t/billing`; no Stripe SDK in this app. Consuming projects supply `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY`. |
| shadcn primitives | ✅ wired | button, card, badge, navigation-menu, separator in `src/components/ui/` |
| DB | — | Not accessed directly (tRPC path). `@t/db` declared but unused. |
| Tests | partial | Playwright e2e (home, auth-routes) + unit tests; coverage threshold 0 (client app). |

## Closeout note (2026-04-26)

HEAD `1ca549b`. All open gaps closed in this batch:

- **`WebClientConfigSchema`** added to `@t/config` — validates all `NEXT_PUBLIC_*` browser env vars
  at the package boundary; apps/web consumes it in `src/lib/trpc/provider.tsx` and
  `instrumentation-client.ts`.
- **`@t/billing-browser` package** created — wraps the RevenueCat Web SDK behind the
  `BillingTracker` port from `@t/billing/ports`; dynamic import guards SSR;
  `registerBillingBrowserDI` wires the DI token; NoOp tracker activates when
  `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY` is absent (dev/test safety).
- **shadcn primitives** landed — button, card, badge, navigation-menu, and separator generated into
  `apps/web/src/components/ui/`; `components.json` fully configured.
- **`browserLogger` re-export** from `@t/logging-browser` — `getLogger()` + `browserLogger` named
  export available; apps/web `src/lib/trpc/provider.tsx` consumes `getLogger()` for client-side tRPC
  error logging.
- **`DashboardSubscriptionStatus`** component renders live entitlement data on `/dashboard` via
  `useEntitlement('pro')` from `@t/billing-browser`; `<AppBillingProvider>` wraps the app in
  `layout.tsx`.

## Gap summary (as of 2026-04-26 closeout)

All gaps closed. apps/web is 100% complete per PRD checklist.

## Notes for next agent

- **ADR-0001 establishes the package-split convention.** Browser uses `@t/analytics-browser` +
  `@t/logging-browser` (posthog-js + console impls); server uses base packages (posthog-node +
  winston). Port is shared from `-types`.
- **Browser billing follows the same split.** `@t/billing-browser` mirrors `@t/analytics-browser`:
  port from `@t/billing/ports`, browser SDK (RevenueCat JS) in `-browser`, NoOp fallback for
  SSR/missing key.
- **Client env vars are validated at the boundary.** `WebClientConfigSchema` in `@t/config` is the
  canonical schema for all `NEXT_PUBLIC_*` vars.
- **Error handling via analytics.** Errors route through `captureException()` on `AnalyticsTracker`,
  not through a separate Logger method. Consistent with the decision to keep browser logging
  lightweight.
- Update this file and `docs/prd-status/matrix.md` on every change to `apps/web/**`.
