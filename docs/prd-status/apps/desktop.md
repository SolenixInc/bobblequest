---
name: apps/desktop bootstrap status
last_audited: 2026-04-30
maintainer_contract: any agent editing apps/desktop/** MUST update this file and docs/prd-status/matrix.md
---

# apps/desktop — bootstrap wiring status

Framework: Electron 32 + electron-vite 2 (React 19 renderer, Tailwind v4, tRPC v11 client)

## Entry points (main, preload, renderer)

- Main: `apps/desktop/src/main/index.ts` — `app.whenReady` → `createWindow()`; `BrowserWindow`
  1200x800, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false`;
  `setWindowOpenHandler` → `shell.openExternal`; loads `ELECTRON_RENDERER_URL` or
  `dist-electron/renderer/index.html`; `electron-store` keyed `session`; `ipcMain.handle` for
  `auth:get-session` / `auth:set-session` / `auth:clear-session`.
- Preload: `apps/desktop/src/preload/index.ts` — `contextBridge.exposeInMainWorld('api', {
  getSession, setSession, clearSession })`. Ambient types in `apps/desktop/src/preload/index.d.ts`.
- Renderer: `apps/desktop/src/renderer/main.tsx` — React 19 `StrictMode` → `ErrorBoundary` →
  `App.tsx`. `App.tsx` renders `<SignedIn><Dashboard/></SignedIn><SignedOut><Login/></SignedOut>`
  inside `TrpcProvider`; routing is Clerk auth-state-driven conditional rendering (no router
  library). `index.html` is the Vite entry. `hooks/useNavigate.ts` deleted 2026-04-26 (was vestigial
  `react-router-dom` stub, never imported).
- Build config: `apps/desktop/electron.vite.config.ts` — three-target build (main, preload,
  renderer) emitting to `dist-electron/{main,preload,renderer}`; renderer uses
  `@vitejs/plugin-react` + `@tailwindcss/vite`.

## @t/* imports (check both main and renderer)

- Main: `@t/config`, `@t/logging`, `@t/dependency-injection`.
- Preload: none.
- Renderer: only `@t/api` for `AppRouter` type (`lib/trpc.ts`). No `@t/*` packages wired.
- `package.json` workspace deps: `@t/api`. (`@t/db` was a dead dep for a renderer process — removed
  2026-04-27.)

## Wiring checklist

| Area | Status | Notes |
| --- | --- | --- |
| Framework — main window | wired | `BrowserWindow` created; hardening flags set (`contextIsolation: true`, `nodeIntegration: false`). `sandbox: false` is the one deviation. |
| Framework — preload bridge | wired | Typed `window.api` surface with `getSession` / `setSession` / `clearSession`. |
| Framework — IPC | wired | Three `ipcMain.handle` channels all scoped to session persistence. No other IPC surface. |
| Config — main | wired | `@t/config` `DesktopConfigValuesSchema` + `resolveDesktopConfig` validate env at boot inside `apps/desktop/src/main/composition.ts#buildContainer()`. Validation failure surfaces an electron `dialog.showErrorBox` and quits the app. (2026-04-26) |
| Config — renderer | partial | `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL` now fail loud at module load (throw on missing in prod; localhost fallback for `VITE_API_URL` in dev only). No Zod schema yet at the renderer boundary — deferred. |
| Logger — main | wired (partial) | `@t/logging` `LoggerFactory` + `Logger` registered in main composition root; boot log emitted on `app.whenReady`. `crashReporter.start()` still not wired. |
| Logger — renderer | partial | `loggerLink` from `@trpc/client` for tRPC ops only; no app-level logger, no `@t/logging` bridge. |
| Error handling — main | wired | `process.on('uncaughtException' | 'unhandledRejection')` registered in `index.ts`; logged via`@t/logging` DI; `dialog.showErrorBox` on fatal. (2026-04-27) |
| Error handling — renderer | wired | React `ErrorBoundary` wraps `App.tsx`; logs to console; styled Tailwind fallback UI. (2026-04-27) |
| Auth | ✅ | `@clerk/clerk-react` wired; `<ClerkProvider>` + headless `email_code` Login + `getToken()`-based Bearer in tRPC client all present. |
| DB | N/A | Desktop talks only to `apps/api`; `@t/db` was listed as dep but never imported — removed 2026-04-27. |
| Billing | ✅ wired | `DesktopBillingProvider` wraps the renderer app; `Paywall` component wired in the renderer; RC Web SDK (`@revenuecat/purchases-js`) initialised via `VITE_REVENUECAT_PUBLIC_API_KEY` (`feat(desktop): wire RC Web SDK + paywall in renderer`). `@t/billing-browser` pattern reused — same RC Web SDK as apps/web, VITE_*prefix instead of NEXT_PUBLIC_*. Consuming projects supply `VITE_REVENUECAT_PUBLIC_API_KEY`. Stripe is server-only; no Stripe SDK in the renderer. |
| Analytics | missing | No `@t/analytics`, no PostHog init. |
| DI | wired (main only) | `apps/desktop/src/main/composition.ts` ships `buildContainer()` + lazy `getContainer()`; registers `Config` → `LoggerFactory` → `Logger`. Mirrors `apps/web/src/lib/composition.ts`. Renderer still wires tRPC client directly. (2026-04-26) |
| Tests | wired | **100/100/100/100 statements/branches/functions/lines (2026-04-30).** Main process: `composition.test.ts`, `index.test.ts`. Preload: IPC bridge fully covered. Renderer: `App`, `AuthFlow`, `ErrorBoundary`, `Dashboard`, `Login`, `bootstrap`, `Welcome`, `Paywall`, `DesktopBillingProvider`, `clerk`, `clientConfig`, `providers`, `trpc`. `vitest.config.ts` thresholds flip 0 → 100 in Track D (in flight). Still pending: Playwright `_electron` harness, CI build matrix. |

## Completion estimate

**~75%** (was ~65%). Test coverage push to 100/100/100/100 landed 2026-04-30. Global error handling
(main process + renderer boundary) wired 2026-04-27. Previously: RC Web SDK billing wired
2026-04-27. Main-process Config + DI + Logger landed 2026-04-26. Remaining: renderer-side env Zod
schema, `@t/auth` main-process bridge, `@t/analytics`, crash reporter, Playwright `_electron`
harness, code signing, auto-update.

## Gap summary

1. ~~**Auth template scaffold pending.**~~ **PARTIAL DONE 2026-04-26.** `@clerk/clerk-react` is
   installed; `<ClerkProvider>` + headless `email_code` `Login.tsx` + `getToken()`-based Bearer in
   `providers.tsx` are all wired. No Supabase code present in renderer. Remaining: `@t/auth`
   main-process bridge / DI registrar; consuming projects must supply `VITE_CLERK_PUBLISHABLE_KEY`.
2. ~~**Zero `@t/*` package integration** beyond the `AppRouter` type import.~~ **PARTIAL DONE
   2026-04-26.** `@t/config`, `@t/dependency-injection`, `@t/logging` now wired in main process via
   `apps/desktop/src/main/composition.ts`. Errors, auth bridge, analytics still unwired.
3. ~~**Env validation absent.**~~ **PARTIAL DONE 2026-04-26.** Main process:
   `DesktopConfigValuesSchema` (`packages/config/entities/schemas/DesktopConfigValuesSchema.ts`) +
   `resolveDesktopConfig` parse `process.env` at boot; failure shows electron `dialog.showErrorBox`
   and quits. Renderer: `clerk.ts` and `providers.tsx` throw on missing `VITE_CLERK_PUBLISHABLE_KEY`
   / `VITE_API_URL` (prod). Remaining: a Zod-based renderer config schema (deferred).
4. ~~**No error boundaries or global error handling** in either process; `@t/errors` delivery
   adapter for Electron is not present.~~ **DONE 2026-04-27.** `process.on` in main + React
   `ErrorBoundary` in renderer.
5. **No crash reporter** (`crashReporter.start()` missing). (Main process logger wired 2026-04-26.)
6. ~~**No tests** (unit or e2e); no Playwright `_electron` launcher config.~~ **Unit tests DONE
   2026-04-30** — coverage at 100/100/100/100 across main, preload, and renderer (App, AuthFlow,
   ErrorBoundary, Dashboard, Login, bootstrap, Welcome, Paywall, DesktopBillingProvider, clerk,
   clientConfig, providers, trpc). Vitest thresholds flip 0 → 100 in Track D (in flight). Playwright
   `_electron` harness still pending.
7. ~~**`hooks/useNavigate.ts` imports `react-router-dom`** but `react-router-dom` is not in
   `package.json` — typecheck will fail. No router chosen per architecture doc; this is a broken
   stub.~~ **RESOLVED 2026-04-26.** `hooks/useNavigate.ts` deleted (was a vestigial stub — unused by
   any other renderer file); `react-router-dom` removed from `package.json`. App uses Clerk
   `<SignedIn>`/`<SignedOut>` conditional rendering with no router needed at this stage. `bun run
   typecheck` exits 0; `electron-vite build` exits 0.
8. ~~**`@t/db` listed as a dep but never imported** — remove or justify.~~ **DONE 2026-04-27** —
   removed from `package.json`.
9. **`sandbox: false`** on the BrowserWindow is a minor hardening regression vs Electron defaults;
   revisit once preload is pure.
10. ~~**RevenueCat Web Billing stub.**~~ ✅ DONE 2026-04-27 — `DesktopBillingProvider` + `Paywall`
    component wired in renderer using RC Web SDK (`VITE_REVENUECAT_PUBLIC_API_KEY`). Remaining
    stubs: auto-update (`electron-updater`), code signing (`mac.identity`, `win.certificateFile`,
    notarization in `electron-builder.yml`).

## Clerk

`@clerk/clerk-react` installed and wired (2026-04-26). Headless `email_code` sign-in flow in
`Login.tsx`; `<ClerkProvider>` + `<SignedIn>`/`<SignedOut>` in `App.tsx`; `getToken()` Bearer
attached to tRPC requests in `providers.tsx`. Consuming projects supply
`VITE_CLERK_PUBLISHABLE_KEY`; no OAuth redirect required under `file://` origin.

## Notes for next agent

- **Error handling complete (2026-04-27).** `process.on('uncaughtException' | 'unhandledRejection')`
  added to main process (logged via `@t/logging` DI); React `ErrorBoundary` added to renderer
  wrapping the app root.
- **Auth is wired (2026-04-26).** `@clerk/clerk-react` installed; `<ClerkProvider>` +
  `<SignedIn>`/`<SignedOut>` + headless `email_code` Login + `getToken()` Bearer in tRPC client are
  all present. No Supabase residue. Consuming projects supply `VITE_CLERK_PUBLISHABLE_KEY`. Next
  step: wire `@t/auth` main-process bridge / DI registrar (deferred).
- **Main-process DI + config + logger wired (2026-04-26).** `apps/desktop/src/main/composition.ts`
  registers `Config` → `LoggerFactory` → `Logger`. `DesktopConfigValuesSchema` validates env at
  boot; failure shows electron `dialog.showErrorBox` and quits. 4 composition tests pass.
- ~~Fix `hooks/useNavigate.ts`~~ — DONE 2026-04-26: stub deleted, `react-router-dom` removed from
  `package.json`. Typecheck + build both pass.
- ~~Introduce `@t/config` for `VITE_API_URL` + Clerk publishable key with Zod validation at renderer
  bootstrap.~~ **PARTIAL 2026-04-26** — main-process schema landed; renderer schema deferred.
  Renderer `clerk.ts` / `providers.tsx` already fail loud on missing vars.
- Call `crashReporter.start()` in `src/main/index.ts`.
- ~~Add a renderer `ErrorBoundary` using `@t/errors` delivery, and register
  `process.on('uncaughtException' | 'unhandledRejection')` in main.~~ **DONE 2026-04-27.**
- ~~Drop `@t/db` from `package.json`~~ — **DONE 2026-04-27.** Removed; renderers talk to `apps/api`
  only.
- **Unit test coverage at 100/100/100/100 (2026-04-30).** Main, preload, and renderer all fully
  covered via Vitest + jsdom + RTL. `vitest.config.ts` thresholds flip 0 → 100 in Track D (in
  flight, separate commit).
- Add Playwright `_electron` harness and a minimal smoke test (`window opens, tRPC client
  constructs, sign-in renders`) — still pending; complements the unit suite, doesn't replace it.
- When modifying `apps/desktop/**`, update this file and `docs/prd-status/matrix.md` in the same
  change per maintainer contract.
