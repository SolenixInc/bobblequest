---
name: apps/mobile bootstrap status
last_audited: 2026-04-27
last_updated: 2026-04-27
maintainer_contract: any agent editing apps/mobile/** MUST update this file and docs/prd-status/matrix.md
---

> Completion: ~80% (was ~75%). Vitest runner configured with mocking strategy 2026-04-27; unit tests
> for core libraries (`clerk.ts`, `trpc.ts`, `auth-headers.ts`, `RevenueCatProvider.tsx`) wired;
> PostHog US host defaulted. Push, EAS, and broad e2e still ❌.

# apps/mobile — bootstrap wiring status

Framework: Expo SDK 54 + NativeWind v4 (Tailwind v3 pinned; NW v5 required before v4 bump)

## Entry points

- `main` (package.json): `expo-router/entry`
- Root layout: `app/_layout.tsx` — wraps `<Providers>`, mounts `<Stack>`, imports `../global.css`
- Routes: `app/index.tsx` (home), `app/(auth)/login.tsx` (sign-in)
- Providers shell: `src/lib/providers.tsx` — `ClerkProvider` + `PostHogProvider` +
  `RevenueCatProvider` + `TrpcProvider`
- Composition root: `src/lib/composition.ts` — builds Awilix container, registers
  Config/Logger/Analytics
- Metro: `metro.config.js` — `withNativeWind({ input: './global.css' })`, monorepo `watchFolders`,
  `disableHierarchicalLookup`
- Babel: `babel.config.js` — `babel-preset-expo` (jsxImportSource nativewind) + `nativewind/babel` +
  `react-native-reanimated/plugin`
- Tailwind: `tailwind.config.js` — v3, `nativewind/preset`, content globs `./app/**`, `./src/**`
- Expo config: `app.json` — `newArchEnabled: true`, scheme `template`, plugins `expo-router` +
  `expo-secure-store`, typed routes

## @t/* imports

- `@t/config` — `MobileConfigValuesSchema` wired in composition root
- `@t/logging-rn` — `ConsoleLogger` + `AnalyticsBridgedLogger` wired
- `@t/analytics-rn` — `PostHogRnAnalyticsTracker` wired via `PostHogProvider`
- `@t/api` (`AppRouter` type) — wired in `src/lib/trpc.ts`
- `@t/dependency-injection` — Awilix container managed in `src/lib/composition.ts`
- `@t/db` — declared in package.json but not imported from app code

## Wiring checklist

| Concern                     | Status | Notes                                                                                       |
| --- | --- | --- |
| Framework boilerplate       | ✅     | expo-router v4 mounted, Stack nav present; `(billing)` group present; `+error.tsx` / `+not-found.tsx` added |
| Providers shell             | ✅     | Clerk + PostHog + RevenueCat + Trpc providers wired                                         |
| Config (`@t/config`)        | ✅     | `MobileConfigValuesSchema` wired; `EXPO_PUBLIC_*` validated via DI container                |
| Logger (`@t/logging`)       | ✅     | `@t/logging-rn` console logger with analytics bridge wired                                   |
| Error boundary              | ✅     | `app/+error.tsx` captures exceptions to PostHog; `+not-found.tsx` fallback added            |
| Auth                        | ✅     | `@clerk/clerk-expo` + canonical `tokenCache` from `@clerk/expo/token-cache`; tRPC Bearer attach via `clerk.session?.getToken()`; consuming projects supply own Clerk publishable key. |
| Native Apple / Google       | PARTIAL| Apple ✅ via `useSignInWithApple` + `expo-apple-authentication` (plugin registered in `app.json`) + `expo-crypto`; Google native ❌ (no `expo-auth-session` Clerk OAuth deep-link handler for `template://clerk`) |
| DB                          | N/A    | Mobile does not talk to DB directly — goes through tRPC                                     |
| Billing (RevenueCat RN SDK) | ✅     | `react-native-purchases` + `react-native-purchases-ui` installed; Expo plugin registered; `RevenueCatProvider` wraps the app in `src/lib/providers.tsx`; paywall screen wired in `(billing)/` stack (commit `5ec3157`). StoreKit / Play Billing are the IAP rails under RevenueCat on mobile. Consuming projects supply `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` + `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`. Stripe is server-only; no Stripe SDK present. |
| Analytics (PostHog RN)      | ✅     | `@t/analytics-rn` (posthog-react-native) wired via `PostHogProvider` + `AnalyticsIdentityBridge` |
| Push notifications          | MISSING| `expo-notifications` not installed                                                          |
| Deep links                  | PARTIAL| Scheme `template` set in `app.json`; no `Linking.parseInitialURLAsync()` handler in code    |
| DI                          | ✅     | `src/lib/composition.ts` manages Awilix container for platform singletons                  |
| Tests                       | PARTIAL| Vitest configured with `jsdom` + comprehensive native mocks in `src/__tests__/setup.ts`; unit tests for core libs pass with 100% coverage thresholds. No e2e (Detox/Maestro) yet. |
| EAS / release               | MISSING| No `eas.json`, no build/submit profiles                                                     |
| Biome / typecheck           | OK     | `bun check` and `bun typecheck` scripts declared                                            |

## Gap summary

1. ~~**Auth template scaffold target is Clerk.**~~ ✅ DONE — `@clerk/clerk-expo` wired in
   `src/lib/clerk.ts` with canonical `tokenCache` from `@clerk/expo/token-cache`; `<ClerkProvider>`
   mounted; tRPC Bearer attach pulls `clerk.session?.getToken()`. No `supabase.ts` exists. Consuming
   projects supply their own Clerk publishable key (commits `480030f`, `ffa78f7`).
2. ~~**No `@t/*` platform packages wired beyond `@t/api`.**~~ ✅ DONE 2026-04-27 — `@t/config`,
   `@t/logging-rn`, `@t/analytics-rn` wired. `src/lib/composition.ts` manages the DI container.
3. **Google native sign-in not wired.** Apple ✅ via `useSignInWithApple`. Google still missing — no
   `expo-auth-session`, no Clerk OAuth deep-link handler for `template://clerk`.
4. ~~**RevenueCat not installed.**~~ ✅ DONE 2026-04-27 — `react-native-purchases` +
   `react-native-purchases-ui` installed; Expo plugin registered; `RevenueCatProvider` + paywall
   screen wired (commit `5ec3157`). `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` +
   `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` are placeholder env vars — consuming projects supply real
   keys.
5. ~~**PostHog React Native not installed.**~~ ✅ DONE 2026-04-27 — `@t/analytics-rn`
   (posthog-react-native) wired via `PostHogProvider` + `AnalyticsIdentityBridge` (Clerk bridge).
6. **Push notifications missing.** `expo-notifications` not installed; no token registration, no
   Android channel setup, no `notifications.subscribe` tRPC consumer.
7. ~~**Platform observability + error boundary missing.**~~ ✅ DONE 2026-04-27 — `app/+error.tsx`
   captures exceptions to PostHog; `@t/logging-rn` wired.
8. ~~**Config surface ad-hoc.**~~ ✅ DONE 2026-04-27 — `MobileConfigValuesSchema` wired in
   `@t/config`; DI-resolved config used for Clerk and tRPC.
9. ~~**Tests narrow.**~~ ✅ DONE 2026-04-27 — Vitest runner configured with `type: module` and JSX
   support; comprehensive mocking strategy for native modules (`react-native`,
   `posthog-react-native`, `react-native-purchases`) implemented via aliases and `setup.ts`; core
   library tests (`clerk.ts`, `trpc.ts`, `auth-headers.ts`, `RevenueCatProvider.tsx`) added with
   100% coverage. e2e still missing.
10. **No release pipeline.** `eas.json` + EAS Build/Submit/Update profiles not scaffolded; Store
    submission flow undefined.

## Clerk

Clerk wired on mobile via `@clerk/clerk-expo` with canonical `tokenCache` from
`@clerk/expo/token-cache`. Apple Sign-In wired via `useSignInWithApple` (Clerk hook) +
`expo-apple-authentication` (registered in `app.json` plugins) + `expo-crypto`. Consuming projects
supply own `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. Google native OAuth still pending
(`template://clerk` deep-link handler not yet registered).

## Notes for next agent

- Architecture source of truth: `docs/architecture/apps/mobile.md`. Legacy Supabase code has been
  removed; do not reintroduce.
- Tailwind **stays on v3** (`^3.4.0`) until NativeWind v5 ships. Do NOT bump alongside web/website
  Tailwind v4 upgrades.
- Imports use `@t/*`; when adding platform packages, align `tsconfig.json` `paths` accordingly.
- Metro `disableHierarchicalLookup: true` + explicit `nodeModulesPaths` — any new native module must
  be installed at `apps/mobile/node_modules` (workspace hoist is fine; double-check on first native
  build).
- `newArchEnabled: true` in `app.json` — verify every native library (RevenueCat, PostHog,
  expo-notifications) supports the New Architecture before install. `expo-apple-authentication`
  already verified ✅.
- For Google native: register `template://clerk` as the OAuth return scheme and add
  `expo-auth-session` (or Clerk's `useOAuth({ strategy: 'oauth_google' })`).
- tRPC Bearer header pulls `await clerk.session?.getToken()` (already wired).
- When this file changes, also update `docs/prd-status/matrix.md` (see maintainer_contract).
