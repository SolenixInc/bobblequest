# apps/mobile

Native iOS + Android client (`@t/mobile`) for the template-repo monorepo. Expo SDK 54 + React Native 0.81 with file-based routing via expo-router, NativeWind v4 styling, Clerk auth backed by `expo-secure-store`, a typed tRPC v11 client against `apps/api`, and RevenueCat for all in-app purchases (Apple IAP + Google IAP, validated server-side). New Architecture is enabled. This README is scaffold for the project team to wire their own env vars, bundle IDs, and EAS profiles.

## Run it

```bash
bun run --filter @t/mobile dev    # expo start; opens in Expo Go or simulator
bun run dev                       # full stack: needs apps/api running for tRPC
```

After starting:
- Press `i` for iOS simulator (macOS only)
- Press `a` for Android emulator
- Scan QR code with Expo Go on a physical device (LAN/tunnel)

Native dev builds: `bun run --filter @t/mobile ios` or `bun run --filter @t/mobile android`.

## Tech

- Expo SDK ~54.0.34 (New Architecture on)
- React Native 0.81.5 + React 19.1.0
- expo-router ~6.0.23 (file-based, typed routes)
- NativeWind v4 + Tailwind v3 (pinned — do not bump alongside web/website)
- Clerk (`@clerk/clerk-expo`) + `expo-secure-store` token cache
- `@trpc/react-query` v11 + `@tanstack/react-query` v5 → `apps/api`
- RevenueCat: `react-native-purchases` + `react-native-purchases-ui` (Apple/Google IAP)
- `@t/analytics-rn` (PostHog native), `@t/logging-rn`
- `react-native-reanimated` ~4.1, `react-native-gesture-handler` ~2.28

## Entry points

- `package.json#main` → `expo-router/entry` (no `App.tsx`; expo-router boots from the `app/` tree)
- `app/_layout.tsx` — RootLayout: ClerkProvider + Providers + Stack nav
- `app/index.tsx` — HomeScreen (session gate, `trpc.users.me`)
- `app/(auth)/login.tsx` — Clerk sign-in / sign-up
- `app/(app)/` — authenticated stack
- `src/lib/providers.tsx` — QueryClient + tRPC provider + Bearer header
- `src/lib/clerk.ts` — Clerk instance with SecureStore tokenCache
- `src/lib/trpc.ts` — `createTRPCReact<AppRouter>` + `getTrpcUrl()`
- `app.json` — Expo config (scheme `template`, bundle IDs, plugins, `newArchEnabled`, typed routes)
- `metro.config.js` — `withNativeWind` + monorepo `watchFolders`
- `eas.json` — EAS build/submit profiles
- `android/app/src/main/AndroidManifest.xml` — Android native shell (no `ios/` yet; generate via `expo run:ios` or EAS Build)

## Configuration

Env vars: see `../../docs/reference/env-vars.md` (Mobile section). `EXPO_PUBLIC_*` vars are inlined into the JS bundle at build time — never put secrets behind that prefix.
App-specific `.env`: `./.env` (template at `./.env.example`).

Deep-link scheme: `template://` (Clerk OAuth → `template://clerk`; billing → `template://receipt`).

## Deeper reading

- Agent rules: `./AGENTS.md`
- Platform architecture: `../../docs/architecture/platform/`
