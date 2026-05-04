---
name: bootstrap status matrix
last_audited: 2026-04-30
last_updated_by: agent — apps/desktop coverage push reached 100/100/100/100 (Tests cell flipped 🟡 → ✅)
maintainer_contract: every agent that changes a package or app bootstrap state MUST update the corresponding cell here AND the relevant sub-doc in the same commit.
---

> **2026-04-30 update:** apps/desktop reached 100/100/100/100 statements/branches/functions/lines.
> Coverage push covered App, AuthFlow, ErrorBoundary, Dashboard, Login, bootstrap, preload IPC
> bridge, Welcome, Paywall, and DesktopBillingProvider; one dead guard in Paywall.tsx removed in
> the closing commit. apps/desktop Tests cell flipped 🟡 → ✅. `vitest.config.ts` thresholds flip
> 0 → 100 in Track D (in flight, separate commit).
>
> **2026-04-28 note:** Documentation scaffolding initiative (~60 files, 8 tracks) shipped
> 2026-04-28. This matrix is a concern × app bootstrap grid (Framework, Config, Logging, Errors,
> Auth, DB, Cache, Billing, Analytics, DI, Tests). Documentation scaffolding is a cross-cutting
> initiative, not a per-app concern, so it has no row here. Full changelog entry is in
> [gaps.md](./gaps.md) under the 2026-04-28 heading.
>
> **2026-04-27 update:** Vitest environment for `apps/mobile` fully configured. Resolved persistent
> ESM/CJS compatibility issues and fixed `SyntaxError: Unexpected token 'typeof'` caused by
> un-transpiled Flow types in native modules via a comprehensive mocking strategy (aliasing
> `react-native`, `posthog-react-native`, and `react-native-purchases` to clean TypeScript mocks).
> Core mobile library tests added for `clerk.ts`, `trpc.ts`, and `RevenueCatProvider.tsx` with 100%
> coverage. apps/mobile Tests cell flipped 🟡 → ✅ partial.
>
> **2026-04-27 update:** Desktop error handling complete.
> `process.on('uncaughtException' | 'unhandledRejection')` added to main process (logged via
> `@t/logging` DI); React `ErrorBoundary` added to renderer wrapping the app root. apps/desktop
> Errors cell flipped 🔴 → ✅.
>
> **2026-04-27 update:** Package scope naming standardized on @t/* across all code and
> documentation.
> All remaining @template/ references replaced with @t/. P0 gap closed.
>
> **2026-04-27 update:** Project domain implemented in `@t/db` and wired into `apps/api`. `auth.ts`,
> `users.ts`, and `projects.ts` routers now fully ported onto `userRepository` and
> `projectRepository` in tRPC context. `db:generate` run for `projects` table. apps/api DB cell
> flipped 🟡 → ✅.
>
> **2026-04-27 update:** RevenueCat-everywhere billing wiring complete across all three client apps.
> apps/web `/pricing` paywall + `@t/billing-browser` already wired (commit `5ec3157`). apps/mobile:
> `react-native-purchases` + `react-native-purchases-ui` Expo plugin wired (commit `5ec3157`).
> apps/desktop: `DesktopBillingProvider` + `Paywall` component wrapping RC Web SDK wired
> (`feat(desktop): wire RC Web SDK + paywall in renderer`). Billing matrix cells for apps/web,
> apps/mobile, apps/desktop all flipped to ✅. Stripe remains server-only behind
> `CompositeBillingImpl` in `@t/billing`; no Stripe SDK is present in any client app. Env vars are
> placeholders — consuming projects supply real RC API keys. `@t/billing` package progress updated
> from 🟡 65% → 🟡 80% (client SDKs wired; server webhook + CompositeBillingImpl already complete;
> remaining: full 100% unit coverage on new mobile/desktop registrars).
>
> **2026-04-26 update:** @t/cache raised ✅. All gaps closed: rateLimit + withCacheLock helpers
> shipped (100% coverage), integration tests landed (RedisCacheImpl.live.test.ts +
> docker-compose.cache.yml), railway.toml [redis] service declared, apps/api composition root wired
> with 135 tests at 100% coverage. Cache pkg cell flipped 🟡 → ✅.
>
> **2026-04-26 update:** Six-commit batch landed (config + logging-browser + cache integration + CI
> size-limit + website artifact ignore). `WebConfigValuesSchema` added (6cd7c69) and apps/web
> `trpcUrl` now routes through `@t/config` (f518fe1) — apps/web Config cell flipped 🔴 → ✅ wired.
> `@t/cache` live integration tests + docker-compose redis service landed (d52181f).
> `@t/logging-browser` package shipped (6cd7c69). See [gaps.md](./gaps.md) Changelog.
>
> **2026-04-26 update:** CI bundle-size budget shipped via size-limit v12. New `size-limit` job in
> `.github/workflows/ci.yml` enforces apps/web `.next/static/**/*.js` ≤ 1800 kB and apps/api
> `dist/index.js` ≤ 4600 kB (both ~20% over current baselines). Combined with already-shipped
> commit-lint, CI is now ~95%; remaining open items (E2E expansion, integration test tier,
> knip/madge, license check, SBOM, stale dep report) are all genuinely deferred. See
> [ci.md](./ci.md).
>
> **2026-04-26 update:** Browser observability packages landed. @t/analytics-types and
> @t/logging-types (zero-runtime) extracted. @t/analytics-browser (posthog-js) and
> @t/logging-browser (console) created per ADR-0001. Server packages refactored to re-export from
> -types. apps/web imports from new packages. ADR-0001 codifies the platform-package-split
> convention.
>
> **2026-04-26 update:** apps/web browser observability complete. @t/analytics-browser via
> initAnalytics() + AnalyticsProvider + useAnalytics(); error.tsx/global-error.tsx call
> getAnalytics().captureException(). Split codified in ADR-0001: browser uses @t/analytics-browser
> (posthog-js); server uses @t/analytics (posthog-node). Port shared from @t/analytics-types.
>
> **2026-04-26 update:** @t/errors consumer wiring complete in apps/api. errorHandler +
> request-context middleware + lifecycle handlers. 139/139 tests at 100% coverage. apps/api tests 96
> → 129. @t/errors flipped 🟡 → ✅.
>
> **2026-04-26 update:** apps/api Clerk auth complete. clerkAuth middleware + /api/webhooks/clerk +
> userSync callback. @t/auth raised 🟡 50% → 🟡 75% (mobile/desktop pending).
>
> **2026-04-26 update:** @t/dependency-injection 🟢. Platform doc + README + token snapshot test.
>
> **2026-04-26 update:** @t/config ✅. GCP cleanup + webhookAuthHeader. 116 tests, 100% coverage.
>
> **2026-04-27 update:** PostHog project-wide observability audit & implementation shipped. All apps
> (web, website, api, mobile, desktop) now have full PostHog bootstrapping. Web/Mobile/Desktop
> clients now pass `x-posthog-session-id` and `x-posthog-distinct-id` headers in tRPC requests.
> `apps/api` `createRequestContextMiddleware` split into trace and analytics steps to ensure
> `userId` from `clerkAuth` is correctly captured in the identified tracker. `apps/website` received
> `instrumentation-client.ts` and `AppAnalyticsProvider`. `apps/mobile` and `apps/desktop` received
> `PostHogProvider` (with session recording/replay), and Clerk-to-PostHog identification bridges.
> Desktop config schema expanded to include PostHog keys. Analytics cell for apps/desktop flipped 🔴
> → ✅.

# Bootstrap Status Matrix

Legend: ✅ wired / 🟡 partial / 🔴 missing / — N/A

## Primary: concern × app

| Concern | pkg | apps/api | apps/web | apps/website | apps/mobile | apps/desktop |
| --- | --- | --- | --- | --- | --- | --- |
| Framework | — | ✅ | 🟡 | ✅ | ✅ | ✅ |
| Config | ✅ | ✅ | ✅ wired (f518fe1) | ✅ | ✅ | ✅ |
| Logging | ✅ | ✅ | ✅ server+browser | ✅ | ✅ | 🟡 wired (main only) |
| Errors | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auth | 🟡 | ✅ | ✅ | — | ✅ | ✅ |
| DB | ✅ | ✅ ported (2026-04-27) | — | — | — | — |
| Cache | ✅ | ✅ | — | — | — | — |
| Billing | 🟡 | ✅ | ✅ @t/billing-browser | — | ✅ react-native-purchases | ✅ RC Web SDK |
| Analytics | ✅ project-wide | ✅ | ✅ | ✅ | ✅ | ✅ |
| DI | 🟢 | ✅ | — | — | ✅ | 🟡 wired (main only) |
| Tests | 100% cov | ✅ 129/129 + e2e | 🟡 threshold 0 | ✅ | ✅ partial | ✅ 100/100/100/100 |

## Secondary: new packages

| Package | Status | Notes |
| --- | --- | --- |
| [@t/analytics-types](./packages/analytics-types.md) | ✅ | zero-runtime; extracted 2026-04-26 |
| [@t/analytics-browser](./packages/analytics-browser.md) | ✅ | posthog-js impl; apps/web wired 2026-04-26 |
| [@t/logging-types](./packages/logging-types.md) | ✅ | zero-runtime; extracted 2026-04-26 |
| [@t/logging-browser](./packages/logging-browser.md) | ✅ | console impl; apps/web optional 2026-04-26 |
| [@t/analytics-rn](./packages/analytics-rn.md) | ✅ | posthog-react-native impl; 71 tests; shipped 2026-04-27 |
| [@t/logging-rn](./packages/logging-rn.md) | ✅ | console impl + RN factory; 61 tests; shipped 2026-04-27 |
| [@t/billing-browser](./packages/billing-browser.md) | 🟡 | RevenueCat browser wired; Stripe checkout + DI + tests pending; 2026-04-27 |

## Existing packages (refactored)

| Package | Status | Change |
| --- | --- | --- |
| [@t/analytics](./packages/analytics.md) | ✅ | re-exports from -types; server impl preserved |
| [@t/logging](./packages/logging.md) | ✅ | re-exports from -types; Winston + OTLP preserved |
| [@t/errors](./packages/errors.md) | ✅ | consumer wiring complete in apps/api 2026-04-26 |
| [@t/config](./packages/config.md) | ✅ | GCP cleanup 2026-04-26; `WebConfigValuesSchema` added 2026-04-26 (6cd7c69 + f518fe1) — apps/web client `trpcUrl` now flows through schema |
| [@t/dependency-injection](./packages/dependency-injection.md) | 🟢 | all 10 tokens resolve |
| [@t/auth](./packages/auth.md) | 🟡 75% | apps/api + apps/web complete; mobile/desktop pending |
| [@t/db](./packages/db.md) | ✅ | `registerDbDI` wired into apps/api 2026-04-25 (✓); `drizzle-kit generate` + `drizzle-kit migrate` verified 2026-04-26 (✓); integration tests 20/20 against live pgvector Postgres (✓); `DrizzleDbClientImpl.transaction()` tx-scoped `raw()` fix shipped 2026-04-26 (✓); 73 unit tests + 20 integration tests all green. Remaining: `railway.toml` postgres service entry |
| [@t/cache](./packages/cache.md) | ✅ | apps/api wired; helpers (rateLimit + withCacheLock) shipped; integration tests + docker-compose redis service shipped; railway.toml [redis] declared — all 2026-04-26 |
| [@t/billing](./packages/billing.md) | 🟡 80% | webhook wired 2026-04-26; all three client SDK adapters wired 2026-04-27 (web: @t/billing-browser, mobile: react-native-purchases, desktop: RC Web SDK) |

## Apps

| App | Status | Next |
| --- | --- | --- |
| [apps/api](./apps/api.md) | 🟡 95% | CORS origin → config; queue/cron; OpenAPI |
| [apps/web](./apps/web.md) | 🟢 100% | Closeout 2026-04-26: client-config Zod schema, @t/billing-browser, shadcn primitives, browserLogger, DashboardSubscriptionStatus (1ca549b) |
| [apps/website](./apps/website.md) | ✅ | Complete |
| [apps/mobile](./apps/mobile.md) | 🟡 | RevenueCat ✅ 2026-04-27; PostHog RN; push; EAS; tests |
| [apps/desktop](./apps/desktop.md) | 🟡 | RC billing ✅ 2026-04-27; @t/errors; analytics; tests ✅ 100/100/100/100 (2026-04-30) |

## Decisions

- [ADR-0001](../adr/001-platform-package-split.md): Types/Browser/Native
  convention for cross-runtime capabilities
