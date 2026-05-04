---
name: analytics-browser bootstrap status
last_audited: 2026-04-26
maintainer_contract: Browser observability for web + electron. Any changes to React provider/hooks or init flow MUST update this doc and docs/prd-status/apps/web.md.
---

# @t/analytics-browser — bootstrap status

**Package status:** ✅ done

**Scope:** Browser implementation of `AnalyticsTracker` port, using `posthog-js` as the underlying
SDK. Exports React provider, hooks, and a module-level singleton init function. Replaces direct
`posthog-js` imports in apps/web (as of 2026-04-26). Optional DI registrar for future composition
roots.

## Intended (per plan)

- Impl: `PostHogBrowserAnalyticsTracker` (implements `AnalyticsTracker` via `posthog-js`)
- Init: module-level `initAnalytics(config?)` singleton (no DI required for simple cases)
- React: `AnalyticsProvider` (wraps PostHog provider), `useAnalytics()` hook, `usePageView()` hook
- Bridge: `ClerkAnalyticsBridge` component (opt-in; wires Clerk identity events)
- DI: `registerAnalyticsBrowserDI(container, options)` for apps with composition roots
- Dependencies: `@t/analytics-types`, `@t/config`, `posthog-js ^1.372.1`, peer `react`

## Actual (present files, 2026-04-26)

- `src/infrastructure/PostHogBrowserAnalyticsTracker.ts`: implements `AnalyticsTracker` via
  `posthog-js`
- `src/infrastructure/NoOpAnalyticsTracker.ts`: fallback for disabled/missing API key
- `src/infrastructure/init.ts`: `initAnalytics(options?)` singleton, reads config from `@t/config`
- `src/react/AnalyticsProvider.tsx`: use-client component, wraps PostHog provider
- `src/react/useAnalytics.ts`: hook returning the singleton `AnalyticsTracker`
- `src/react/usePageView.ts`: hook capturing pageview via `usePathname` + `useSearchParams`
- `src/react/ClerkAnalyticsBridge.tsx`: use-client component, wires Clerk identify via
  `@clerk/nextjs`
- `src/dependency-injection/registerAnalyticsBrowserDI.ts`: DI registrar for future composition
  roots
- `src/index.ts`: barrel re-exports port (from `-types`) + impl + factories
- `package.json`: `@t/analytics-browser`, deps on `@t/analytics-types`, `@t/config`, `posthog-js
  ^1.372.1`
- `tsconfig.json`: extends repo base
- `vitest.config.ts`: 100% coverage threshold; env: jsdom
- Tests: 100% coverage

## Consumer hooks (what apps call to bootstrap)

- `initAnalytics(options?)` — call once at app startup (via `instrumentation.ts` or root layout);
  reads config from env
- `<AnalyticsProvider children>` — wrap `<html><body>` in layout.tsx
- `useAnalytics()` — hook returning the singleton; call in any client component
- `tracker.capture(event, properties)` — track a custom event
- `tracker.captureException(error, properties?)` — report an error
- `<ClerkAnalyticsBridge />` — opt-in component (assumes `@clerk/nextjs` is available)
- `usePageView()` — hook capturing pageview automatically
- `useIdentify(userId, traits)` — hook sending identify event

## Config (reads from @t/config)

- `NEXT_PUBLIC_POSTHOG_KEY`: PostHog API key (required; if missing, uses NoOp)
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog host (optional; defaults to PostHog cloud)
- Hardcoded defaults: `defaults: "2026-01-30"`, `capture_pageview: false`, `person_profiles:
  "identified_only"`

## Notes for next agent

- The package re-exports `AnalyticsTracker` from `@t/analytics-types` so apps can type-hint against
  the abstract port.
- `PostHogBrowserAnalyticsTracker` stamps `$environment` and `$service` super-properties on every
  event (mirrors server impl).
- Reserved keys are stripped at the port boundary; see `ReservedSuperProps` in `@t/analytics-types`.
- `usePageView()` hook is lightweight — it reads `usePathname()` + `useSearchParams()` and calls
  `capture("$pageview", ...)` on every route change.
- `ClerkAnalyticsBridge` is optional and wires `_isIdentified()` from `@clerk/nextjs` into
  `tracker.identify()` — encapsulates the private API guard.
- DI registrar is provided for future apps; existing apps/web uses the singleton init pattern.
