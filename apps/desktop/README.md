# apps/desktop

Cross-platform Electron desktop client for the template monorepo. Electron 32 + electron-vite with TypeScript main process, React 19 + Tailwind v4 renderer, and a context-isolated preload bridge between them. Auth runs through Clerk's headless email-code flow (OAuth redirects fail under `file://`); tRPC v11 talks to `apps/api` with a Bearer JWT attached by `authHeaderLink`. Cross-platform purchases route through RevenueCat (`@revenuecat/purchases-js`) so subscription state stays consistent with web and mobile clients.

## Run it

```bash
bun run --filter @t/desktop dev      # electron-vite dev (HMR for main + preload + renderer)
bun run dev                          # full stack (needs apps/api up)
```

## Tech

- Electron 32
- electron-vite 2 (HMR for main, preload, renderer)
- React 19 + React DOM 19 (renderer)
- Tailwind CSS v4 + `@tailwindcss/vite`
- `@clerk/clerk-react` 5 (headless email-code sign-in)
- `@revenuecat/purchases-js` (cross-platform subscription sync)
- tRPC v11 client + `@tanstack/react-query` 5 → `apps/api`
- `posthog-js` (renderer analytics)
- `@t/logging` (main-process logging)
- `@t/config`, `@t/dependency-injection` (boot-time config + composition root)
- electron-builder 25 (installer packaging)
- Biome 2 (lint/format), Vitest 2 + Testing Library (tests)

## Entry points

- `src/main/index.ts` — main process: BrowserWindow, `ipcMain`, `electron-store`
- `src/main/composition.ts` — composition root (`buildContainer()` / `getContainer()`); validates env via `DesktopConfigValuesSchema` + `resolveDesktopConfig` at boot
- `src/preload/index.ts` — sandboxed preload, sole `contextBridge.exposeInMainWorld('api', ...)`
- `src/preload/index.d.ts` — ambient `window.api` type for the renderer
- `src/renderer/main.tsx` — React 19 StrictMode mount
- `src/renderer/App.tsx` — session gate (SignIn | Dashboard) wrapped in `TrpcProvider` + `ClerkProvider`
- `electron.vite.config.ts` — build config (outputs to `dist-electron/{main,preload,renderer}/`; installers to `release/`)

## Configuration

Env vars: see `../../docs/reference/env-vars.md` (Desktop section). Renderer-side vars must be prefixed `VITE_*` (inlined into the renderer bundle at build time). Main-process vars (`NODE_ENV`, `LOG_LEVEL`, `PORT`) are validated at boot — missing required vars surface an `Electron.dialog.showErrorBox` and quit. No silent fallbacks.

App-specific .env: `./.env` (template at `./.env.example`).

## Build & test

```bash
bun run --filter @t/desktop build       # electron-vite build
bun run --filter @t/desktop pack        # electron-builder --dir (unpacked)
bun run --filter @t/desktop dist        # electron-builder (full installer)
bun run --filter @t/desktop typecheck   # tsc --noEmit
bun run --filter @t/desktop check       # biome check
bun run --filter @t/desktop test        # vitest run
```

## Deeper reading

- Agent rules: `./AGENTS.md`
- Architecture: `../../docs/architecture/apps/desktop.md`
- Platform overview: `../../docs/architecture/platform/`
