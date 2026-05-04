# apps/desktop

> **Template scaffolding.** Auth uses Clerk via `@clerk/clerk-js` in the renderer. Projects
> consuming this template must configure their own Clerk credentials (`VITE_CLERK_PUBLISHABLE_KEY`).

Electron desktop client for the template monorepo. Built with `electron-vite`: TypeScript in the
main process, a React 19 + Tailwind v4 renderer, and a context-isolated preload bridge. Auth is
delegated to **Clerk** via `@clerk/clerk-js`: the renderer initializes a `<ClerkProvider>` and sends
the Clerk session JWT as `Authorization: Bearer` on every tRPC call. `apps/api` verifies the JWT via
`@clerk/backend` behind the `@t/auth` port. Session tokens are stored by Clerk's own built-in
persistence (localStorage in the renderer); the main process stores the session reference via
`electron-store` only if Clerk's own persistence is insufficient for the offline case. Stripe
billing, auto-update, code signing, and a crash reporter are stubbed for v0.2. Current state is an
intentionally minimal scaffold.

## High-Level Architecture

```mermaid
flowchart TB
    user([User desktop<br/>macOS / Windows / Linux])

    subgraph electron["Electron app process tree"]
        direction TB

        subgraph main["Main process (Node.js) — src/main/index.ts"]
            direction TB
            app_lifecycle["app.whenReady / activate /<br/>window-all-closed"]
            browser_window["BrowserWindow<br/>1200x800, min 800x600<br/>contextIsolation: true<br/>nodeIntegration: false"]
            ipc_main["ipcMain.handle<br/>auth:get-session<br/>auth:clear-session<br/>(optional: store Clerk session ref)"]
            store["electron-store<br/>~/Library/Application Support/<br/>Template Desktop/session.json"]
            shell_handler["shell.openExternal<br/>(setWindowOpenHandler)"]

            app_lifecycle --> browser_window
            ipc_main <--> store
        end

        subgraph preload["Preload (sandboxed bridge) — src/preload/index.ts"]
            direction TB
            context_bridge["contextBridge.exposeInMainWorld('api', ...)<br/>getSession / clearSession (optional)"]
        end

        subgraph renderer["Renderer (Chromium) — src/renderer/"]
            direction TB
            react_root["React 19 StrictMode root<br/>main.tsx → App.tsx"]

            subgraph providers["TrpcProvider (lib/providers.tsx)"]
                query_client["QueryClient<br/>@tanstack/react-query"]
                trpc_client["tRPC client v11<br/>httpBatchLink + loggerLink"]
                auth_link["authHeaderLink<br/>injects Bearer from IPC session"]
            end

            subgraph ui["UI tree"]
                signin["SignIn.tsx<br/>Clerk <SignIn /> component"]
                dashboard["Dashboard.tsx<br/>trpc.users.me.useQuery"]
            end

            clerk_js["@clerk/clerk-js<br/>ClerkProvider · getToken()"]
        end
    end

    subgraph external["External services"]
        direction TB
        api["apps/api on Railway<br/>Bun + Hono + tRPC<br/>AppRouter type source"]
        Clerk["Clerk (hosted)<br/>sign-in · JWT issuance"]
        browser_checkout["Default browser<br/>Stripe Checkout session<br/>(stubbed — v0.2)"]
        update_feed["Auto-update feed<br/>(stubbed — v0.2)"]
    end

    user -->|launches binary| app_lifecycle
    browser_window -->|loadURL / loadFile| react_root
    browser_window -. preload script .-> context_bridge

    react_root --> providers
    react_root --> ui
    ui -->|hooks| providers
    ui --> clerk_js

    context_bridge -. window-api IPC .-> ipc_main
    ipc_main -. IPC response .-> context_bridge

    clerk_js -->|HTTPS| Clerk
    Clerk -->|session JWT| clerk_js

    auth_link -->|getToken()| clerk_js
    trpc_client -->|HTTPS + Bearer JWT<br/>VITE_API_URL| api

    dashboard -. future checkout URL .-> shell_handler
    shell_handler -. openExternal .-> browser_checkout
    browser_checkout -. Stripe webhook .-> api

    update_feed -. autoUpdater stub .-> main

    classDef stub stroke-dasharray:4 4,stroke:#999,color:#666
    class browser_checkout,update_feed stub
```

## File Layout

```text
apps/desktop/
├── electron-builder.yml          Build targets: NSIS (win x64), DMG (mac x64/arm64), AppImage (linux x64)
├── electron.vite.config.ts       main / preload / renderer configs; renderer uses @vitejs/plugin-react + @tailwindcss/vite
├── index.html                    Renderer entry; CSP locked to self + https:*; mounts /src/renderer/main.tsx
├── package.json                  @t/desktop · main = dist-electron/main/index.js · scripts: dev/build/dist/pack
├── tsconfig.json                 Extends root; paths alias @t/* → packages/*/src
├── tsconfig.node.json            Main/preload build config
├── README.md                     Quick start + v0.2 deferral notes
└── src/
    ├── main/
    │   └── index.ts              BrowserWindow creation, electron-store (optional session ref), ipcMain handlers
    ├── preload/
    │   ├── index.ts              contextBridge.exposeInMainWorld('api', { getSession, clearSession })
    │   └── index.d.ts            Ambient type for window.api
    └── renderer/
        ├── main.tsx              React 19 root mount (StrictMode)
        ├── App.tsx               Session gate → SignIn | Dashboard, wrapped in TrpcProvider + ClerkProvider
        ├── styles.css            Tailwind v4 entry
        ├── components/
        │   ├── SignIn.tsx        Clerk `<SignIn />` component
        │   └── Dashboard.tsx     trpc.users.me.useQuery + signOut
        ├── hooks/
        │   └── useNavigate.ts    Minimal route placeholder
        └── lib/
            ├── providers.tsx     TrpcProvider (QueryClient, loggerLink, authHeaderLink: uses Clerk getToken, httpBatchLink)
            ├── trpc.ts           createTRPCReact<AppRouter> from @t/api
            └── clerk.ts          Clerk instance (`Clerk.load()` with publishable key)
```

Build output lives in `dist-electron/{main,preload,renderer}/` (per `electron.vite.config.ts`).
Installers land in `release/` (per `electron-builder.yml`).

## Main vs Renderer Responsibilities

| Concern                            | Main (`src/main`) | Preload (`src/preload`) | Renderer (`src/renderer`) |
| --- | --- | --- | --- |
| Node APIs (`fs`, `path`, `shell`)  | Yes               | No                      | No (`nodeIntegration: false`) |
| BrowserWindow lifecycle            | Yes               | —                       | — |
| Electron-store session ref (optional) | Yes (owner, if Clerk persistence insufficient) | — | Reads/writes via IPC only |
| IPC channel definition (`ipcMain.handle`) | Yes        | —                       | — |
| IPC surface exposure (`contextBridge`) | —             | Yes (sole bridge)       | — |
| `window.api` consumer              | —                 | —                       | Yes |
| React / React DOM                  | —                 | —                       | Yes |
| Tailwind v4 + Vite HMR             | —                 | —                       | Yes |
| Clerk Auth (`@clerk/clerk-js`)      | —                 | —                       | Yes (`<ClerkProvider>` + `getToken()`) |
| tRPC client → `apps/api`           | —                 | —                       | Yes (Bearer JWT from Clerk `getToken()`) |
| `AppRouter` type import            | —                 | —                       | Yes (`@t/api`) |
| External URL handoff (`shell.openExternal`) | Yes (via `setWindowOpenHandler`) | — | Triggers via `window.open` or future IPC |
| CSP enforcement                    | —                 | —                       | Yes (`<meta http-equiv>` in `index.html`) |
| Auto-update (stub)                 | Future owner      | —                       | — |
| Crash reporter (stub)             | Future owner      | —                       | Emits to `@t/logging` |

Security posture matches the Electron hardening guide: `contextIsolation: true`, `nodeIntegration:
false`, and all cross-process calls go through the typed `window.api` surface defined in
`preload/index.d.ts`. The renderer never touches the filesystem or `ipcRenderer` directly.

## Configuration

Schema:
C:\Users\jager\OneDrive\Documents\GitHub\template-repo\packages\config\entities\schemas\DesktopConfigValuesSchema.ts
(`DesktopConfigValuesSchema`, `resolveDesktopConfig`).

| Var | Required | Source | Notes |
| --- | --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | yes | renderer (Vite) | Clerk publishable; throws if missing |
| `VITE_API_URL` | yes (prod) | renderer (Vite) | tRPC base URL; localhost in dev |
| `NODE_ENV` | yes | main | Fed into `ENVIRONMENT` enum |
| `LOG_LEVEL` | no | main | Defaults to `info` |
| `PORT` | no | main | Defaults to `8000` |

## Composition Root

File: C:\Users\jager\OneDrive\Documents\GitHub\template-repo\apps\desktop\src\main\composition.ts

Lazy module-level singleton. Exports `buildContainer()` and `getContainer()`.

Registrar order (strict):

1. `registerConfigRepo(container, { schema: DesktopConfigValuesSchema })`
2. `registerLoggerFactoryDI(container)`
3. `registerLoggerDI(container, { context: { fileName, metadata } })`

Not registered: cache, db, auth, billing — desktop main is thin; add when needed.

```text
env vars
   |
   v
resolveDesktopConfig
   |
   v
buildContainer -- register Config --> LoggerFactory --> Logger
   |
   v
app.whenReady -> resolve LOGGER -> log boot
```

Failure mode: validation throws -> `electron.dialog.showErrorBox` -> `app.quit()`.

## Renderer Configuration

- C:\Users\jager\OneDrive\Documents\GitHub\template-repo\apps\desktop\src\renderer\lib\clerk.ts
  throws on missing `VITE_CLERK_PUBLISHABLE_KEY`.
- C:\Users\jager\OneDrive\Documents\GitHub\template-repo\apps\desktop\src\renderer\lib\providers.tsx
  `resolveApiUrl`: dev fallback to `http://localhost:3001`; prod throws on missing `VITE_API_URL`.
- Renderer config remains build-time injected (Vite); main process is the validated boundary.

## Bootstrap Status

Mirrors the `apps/desktop` slice of [root ARCHITECTURE.md § Long-Term
Progress](../ARCHITECTURE.md#long-term-progress).

- [x] `electron-vite` + React + TS scaffold
- [x] `contextIsolation: true` + `nodeIntegration: false` hardening
- [x] Typed `window.api` preload surface (`preload/index.d.ts`)
- [x] tRPC client scaffold
- [ ] `@clerk/clerk-js` wired in renderer: `<ClerkProvider>`, Clerk instance init, `getToken()` on
  tRPC links (`authHeaderLink`), sign-in / sign-up components
- [ ] Auto-update channel (`electron-updater`) + feed URL
- [ ] Code-signing (macOS identity + Windows cert + notarization)
- [ ] Crash reporter → `@t/logging`
- [ ] Stripe Checkout flow (`shell.openExternal` → browser → `apps/api` webhook)
- [ ] Env validation via `@t/config`
- [ ] Renderer router (multi-page navigation beyond `Dashboard`)
- [x] Unit tests (main + renderer) — 100/100/100/100 statements/branches/functions/lines
  (2026-04-30); Vitest + jsdom + RTL covers main composition + index, preload IPC bridge, and
  the full renderer surface
- [ ] CI build matrix (macOS / Windows / Linux)
- [ ] Platform SDK TODOs resolved (`providers.tsx`, `trpc.ts`, `Dashboard.tsx`)

## Open Items

Tracked against `docs/architecture/ARCHITECTURE.md` § `apps/desktop`:

- **Auto-update channel** — `autoUpdater` / `electron-updater` not imported; no update feed URL
  wired, no signing keys.
- **Code signing** — `electron-builder.yml` has no `mac.identity`, no `win.certificateFile`, no
  notarization step. Required before distribution.
- **Crash reporter** — no `crashReporter.start()` in `src/main/index.ts`; should funnel to
  `@t/logging` once that package lands.
- **Stripe billing** — no Stripe SDK in `package.json`. Intended flow: renderer calls `apps/api` to
  mint a Checkout Session, passes URL to `shell.openExternal`, webhook lands on `apps/api`. None of
  this is wired yet.
- **Platform SDK integrations** — three TODO markers flag deferred imports:
  - `lib/providers.tsx` — `@nutraforgetechnologies/notifications` for system tray / toast bridge.
  - `lib/trpc.ts` — `@nutraforgetechnologies/ai` for streaming chat client.
  - `components/Dashboard.tsx` — `@nutraforgetechnologies/billing` for license / subscription panel.
- **Routing** — `hooks/useNavigate.ts` is a stub; the app is a single-screen gate today. A router
  (TanStack Router or similar) is not yet chosen.
- **Clerk requires network on token refresh.** `@clerk/clerk-js` needs to reach Clerk to refresh
  sessions. Offline-first desktop UX must handle a cold session gracefully: detect the network
  error, show a sign-in modal, and retry rather than silently failing tRPC calls.
- **Tests** — unit suite at 100/100/100/100 statements/branches/functions/lines (2026-04-30) via
  Vitest + jsdom + React Testing Library, covering main process (`composition`, `index`), preload
  IPC bridge, and the full renderer (`App`, `AuthFlow`, `ErrorBoundary`, `Dashboard`, `Login`,
  `bootstrap`, `Welcome`, `Paywall`, `DesktopBillingProvider`, `clerk`, `clientConfig`,
  `providers`, `trpc`). `vitest.config.ts` thresholds flip 0 → 100 in Track D (in flight). E2e
  harness (Playwright `_electron` launcher) not yet configured.
- **CI** — no GitHub Actions workflow publishes installers; `electron-builder` runs only locally via
  `bun run --filter @t/desktop dist`.
