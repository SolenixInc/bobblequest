---
name: analytics bootstrap status
last_audited: 2026-04-27
maintainer_contract: any agent editing packages/analytics/** or apps/*/analytics wiring MUST update this file and docs/prd-status/matrix.md
---

# @t/analytics — bootstrap status

**Package status:** ✅ done

**Scope:** Server-only analytics implementation using `posthog-node`. In 2026-04-26, the port and
types were extracted to `@t/analytics-types` (zero-runtime); this package now re-exports from
`-types` and keeps infrastructure impl + DI registrar. Browser surfaces use `@t/analytics-browser`
(posthog-js impl); React Native surfaces use `@t/analytics-rn` (posthog-react-native impl). The port
is shared; the impl swaps at registration time.

Phase 1 (port + server impls + DI + tests) fully landed. apps/api composition root wires
`registerAnalyticsDI`; per-request scope created in `apps/api/src/middleware/request-context.ts`.
`RequestAnalyticsTracker.captureException(error, context?)` overload used by `@t/errors` for
request-scoped exception capture. 83/83 tests pass at 100% coverage on the server package; 50 tests
cover the shared scrubber in `@t/analytics-types`; 55 tests cover `@t/analytics-browser`; the
parallel RN adapter mirrors the browser test surface.

## Intended (per docs)

- Port: `AnalyticsTracker` (11 methods) + `RequestAnalyticsTracker` wrapper — live in
  `@t/analytics-types`
- Impl: `PostHogAnalyticsTrackerImpl` (posthog-node), `NoOpAnalyticsTracker`,
  `RequestAnalyticsTrackerImpl`
- DI: `registerAnalyticsDI(container, { config, environment, service })`
- Centralized PII scrubber at the port boundary, shared across server / browser / RN

## Actual (present files, refactored 2026-04-26)

- `src/entities/index.ts`: re-exports from `@t/analytics-types`
- `src/infrastructure/PostHogAnalyticsTrackerImpl.ts`: imports port + types from
  `@t/analytics-types`
- `src/infrastructure/NoOpAnalyticsTracker.ts`: same
- `src/infrastructure/RequestAnalyticsTrackerImpl.ts`: same
- `src/dependency-injection/registerAnalyticsDI.ts`: `registerAnalyticsDI(container, { config,
  environment, service })` — selection testing→disabled→missing-apiKey→PostHog
- `src/index.ts`: re-exports `@t/analytics-types` + impl + DI registrar
- `package.json`: `@t/analytics`, deps on
  `@t/{analytics-types,config,dependency-injection,logging}`, `posthog-node ^4.0.0`, peer `awilix
  ^12.0.0`
- Tests: 6 Vitest files, **83/83 pass at 100% coverage**

## Consumer hooks

- `registerAnalyticsDI(container, { config, environment, service })` — call once in composition root
- `container.resolve(dependencyKeys.global.ANALYTICS)` — get process-wide `AnalyticsTracker`
- `container.resolve(dependencyKeys.request.REQUEST_ANALYTICS)` — per-request wrapper

## Closed gaps (2026-04-26)

- ✅ **Centralized PII scrubber at port boundary** — `scrubPiiFromProperties`, `scrubPiiFromTraits`,
  `scrubEvent` shipped in `@t/analytics-types/src/redaction/scrubPii.ts` (commit `105f91a`, 50
  tests). Covers denylist keys, email, IPv4/v6, JWT, bearer tokens, and Luhn-checked credit cards;
  reserved super-props (`$environment`, `$service`, `$session_id`, `distinct_id`, `request_id`,
  `$group`) pass through untouched; idempotent.
- ✅ **Browser adapter (`@t/analytics-browser` via `posthog-js`)** — `PostHogBrowserAnalyticsTracker`
  implements the full `AnalyticsTracker` port and routes every user-controlled payload through the
  shared scrubber before forwarding to posthog-js. 55 tests passing.
- ✅ **React Native adapter (`@t/analytics-rn` via `posthog-react-native@4.43.5`)** —
  `PostHogRnAnalyticsTracker` mirrors the browser adapter exactly and consumes the same scrubber.
  RN-specific `captureScreen(name, props?)` uses the SDK's first-class `posthog.screen()` API;
  `await posthog.ready` is gated at app startup.
- ✅ **All three adapters consume the same `scrubPii` utilities from `@t/analytics-types`** — single
  source of truth, no SDK-specific scrubber forks.
- ✅ **DI registration normalized to `dependencyKeys.global.ANALYTICS` across browser + RN
  registrars** — `registerAnalyticsBrowserDI` and `registerAnalyticsRnDI` both bind under the same
  token used by the server `registerAnalyticsDI`, so consumers resolve uniformly across server /
  browser / RN.

## Notes for next agent

- **Port extracted 2026-04-26:** All port/type/schema files moved to `@t/analytics-types`; this
  package now re-exports from there.
- Server implementation (PostHog Node SDK) is complete and stable.
- Browser observability now uses `@t/analytics-browser` instead of direct `posthog-js`.
- React Native observability uses `@t/analytics-rn` (mirrors the browser adapter exactly).
- The port shape is sealed at 11 methods; adding a 12th requires an ADR.
- See ADR-0001 for the platform package split convention.
- See `packages/analytics-types/README.md` for the public PII scrubber surface.
