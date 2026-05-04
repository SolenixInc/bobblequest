# apps/web

> **Template scaffolding.** Auth uses Clerk via `@clerk/nextjs`. Projects consuming this template
> must configure their own Clerk credentials (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
> `CLERK_SECRET_KEY`).

Primary authenticated product UI for the template monorepo. Next.js 15 App Router with React Server
Components, Tailwind v4 + Shadcn/ui, and a tRPC React client wired to `apps/api`'s exported
`AppRouter` type. Auth is delegated to **Clerk** via `@clerk/nextjs`: `<ClerkProvider>` wraps the
root layout, `clerkMiddleware()` runs on every request, and `getToken()` (server + client) supplies
the Bearer JWT attached to tRPC calls. `apps/api` verifies that token via `@clerk/backend` behind
the `@t/auth` port. Dev runs `next dev` on port 3000 (Playwright's `baseURL`); Railway runs `next
start` as the web service. See [ARCHITECTURE.md](../ARCHITECTURE.md) for monorepo-wide conventions.

---

## High-Level Architecture

```mermaid
flowchart TB
    Browser["Browser (React 19)<br/>Shadcn/ui · Tailwind v4"]

    subgraph Web["apps/web — Next.js 15 (Railway service)"]
        MW["middleware.ts<br/>clerkMiddleware()<br/>runs on every request · gates protected routes"]

        subgraph Router["App Router — src/app/"]
            Layout["layout.tsx (RSC)<br/>&lt;ClerkProvider&gt; + TrpcProvider"]
            Home["page.tsx (RSC)<br/>public"]
            SignIn["sign-in/[[...sign-in]]/page.tsx<br/>&lt;SignIn /&gt; from @clerk/nextjs"]
            SignUp["sign-up/[[...sign-up]]/page.tsx<br/>&lt;SignUp /&gt; from @clerk/nextjs"]
            Dash["dashboard/page.tsx (RSC)<br/>auth() → userId or redirect"]
        end

        subgraph Lib["src/lib/"]
            TProvider["trpc/provider.tsx<br/>QueryClient + httpBatchLink<br/>fetch header: Authorization: Bearer $(getToken)"]
            TClient["trpc/client.ts<br/>createTRPCReact&lt;AppRouter&gt;"]
        end
    end

    subgraph Clerk["Clerk (hosted)"]
        CIssue["Sign-in UI · JWT issuer<br/>JWKS endpoint"]
    end

    subgraph Api["apps/api (Railway)"]
        Hono["Hono + tRPC router<br/>clerkAuth middleware<br/>AppRouter type export"]
    end

    Browser -->|HTTPS| MW
    MW -->|user resolved| Router
    Layout --> TProvider
    Dash -->|auth()| CIssue
    SignIn -->|redirect / modal| CIssue
    SignUp -->|redirect / modal| CIssue
    MW -->|protectedRoute() check| CIssue
    Browser -->|trpc hooks| TProvider
    TProvider -->|httpBatchLink + Bearer JWT<br/>NEXT_PUBLIC_TRPC_URL| Hono
    Hono -->|verify via JWKS| CIssue
    TClient -.->|type-only import| Hono
```

Notes:

- `middleware.ts` uses `clerkMiddleware()` from `@clerk/nextjs/server`. Protected route patterns are
  declared via `createRouteMatcher([...])` and enforced with `auth().protect()`; unauth users are
  redirected to `/sign-in` automatically by Clerk.
- `<ClerkProvider>` wraps the root `layout.tsx` and supplies session state to both server (`auth()`,
  `currentUser()`) and client (`useAuth()`, `useUser()`) components.
- The `TrpcProvider` is mounted inside `<ClerkProvider>` in the root layout so every client tRPC
  call can inject `Authorization: Bearer <token>` via `getToken()` (Clerk's per-request session
  token). RSC routes can call tRPC procedures server-side by passing `await auth().getToken()` to a
  server-side tRPC caller.
- The only cross-app runtime dependency is the HTTP call from `httpBatchLink` to `apps/api`. The
  `@t/api` import is type-only (`AppRouter`), preserved through `transpilePackages` in
  `next.config.mjs`.
- Port: `bun run dev` → 3000 (matches `playwright.config.ts` `baseURL`). `bun run start` → Next's
  default 3000 unless Railway injects `PORT`. The monorepo ARCHITECTURE lists `:3001 (SSR)` for web
  — that is aspirational; confirm against `railway.toml` before relying on it.
- React 19 + Next 15 App Router: `layout.tsx` is an RSC, but `TrpcProvider` is a client boundary
  (`'use client'`) so the QueryClient and trpc client are created with `useState(() => ...)` to
  survive fast refresh without leaking state across requests.
- Styling pipeline: Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.*` required in v4).
  `components.json` is present for future Shadcn/ui generation.

---

## File Layout

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # RSC root; <ClerkProvider> + <TrpcProvider>; emits 'web boot' log
│   │   ├── page.tsx              # RSC home, public
│   │   ├── globals.css           # Tailwind v4 entry
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/page.tsx   # Clerk <SignIn /> catch-all
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/page.tsx   # Clerk <SignUp /> catch-all
│   │   └── dashboard/
│   │       └── page.tsx          # RSC — await auth() + redirectToSignIn()
│   ├── lib/
│   │   ├── clerk.ts              # barrel re-export from @clerk/nextjs
│   │   ├── composition.ts        # 'server-only' DI: config → loggerFactory → logger → analytics
│   │   ├── logger.ts             # 'server-only' resolves LOGGER from container
│   │   ├── analytics.ts          # 'server-only' resolves ANALYTICS from container
│   │   ├── trpc/
│   │   │   ├── client.ts         # createTRPCReact<AppRouter>()
│   │   │   └── provider.tsx      # 'use client'; QueryClient + httpBatchLink + Clerk useAuth() Bearer
│   │   └── utils.ts              # cn() / class helpers
│   └── middleware.ts             # clerkMiddleware() with App Router matcher
├── e2e/
│   ├── home.spec.ts              # Playwright — title /Template Web App/
│   └── auth-routes.spec.ts       # Playwright — /sign-in, /sign-up, /dashboard redirect (CLERK-gated)
├── playwright.config.ts          # baseURL :3000; webServer next dev --port 3000
├── next.config.mjs               # transpilePackages: @t/{analytics,api,config,db,dependency-injection,errors,logging}
├── postcss.config.mjs            # @tailwindcss/postcss
├── components.json               # Shadcn/ui config
├── vitest.config.ts              # unit-test runner (no specs yet)
├── .env.example                  # NEXT_PUBLIC_CLERK_*, CLERK_SECRET_KEY, NEXT_PUBLIC_TRPC_URL
├── tsconfig.json
└── package.json                  # next 15, react 19, @trpc/* 11, @clerk/nextjs ^7.2.3
```

---

## Data Flow

| Route / Surface          | RSC fetch?           | tRPC procedures called | Auth required?                       |
| --- | --- | --- | --- |
| `/` (home)               | RSC, static markup   | none                   | no                                   |
| `/sign-in/*`             | Clerk `<SignIn />`   | none                   | no (renders Clerk-hosted UI)         |
| `/sign-up/*`             | Clerk `<SignUp />`   | none                   | no                                   |
| `/dashboard`             | RSC + `await auth()` | optional server caller | yes — `auth().protect()` redirects unauth to `/sign-in` |
| Any `trpc.*` hook        | client, via `httpBatchLink` → `NEXT_PUBLIC_TRPC_URL` | whatever the caller invokes on `AppRouter` | depends on procedure (`publicProcedure` vs `protectedProcedure` in `apps/api`) |
| `middleware.ts`          | runs on every request (matcher excludes `_next` + static) | none | enforces `createRouteMatcher(protectedRoutes)` via `auth().protect()` |

Auth lifecycle:

1. User hits `/sign-in` → Clerk-hosted `<SignIn />` component runs sign-in flow (password / OAuth /
   passkey depending on Clerk dashboard config). On success Clerk issues a session and redirects
   back to the app.
2. `<ClerkProvider>` hydrates the client-side session; `useAuth()` returns `{ isSignedIn, userId,
   getToken }`.
3. `middleware.ts` runs `clerkMiddleware()` on every request.
   `createRouteMatcher(['/dashboard(.*)'])` marks protected paths; `auth().protect()` inside the
   middleware redirects unauth users to `/sign-in`.
4. RSC routes read the session via `auth()` / `currentUser()` from `@clerk/nextjs/server`. `auth()`
   returns `{ userId, sessionId, getToken }`; `userId == null` means unauthenticated.
5. Client tRPC calls attach `Authorization: Bearer ${await getToken()}` via the `httpBatchLink`
   `headers` option. `apps/api` verifies the token via `@clerk/backend` behind the `@t/auth` port.
   Server tRPC callers pass the RSC-side token similarly.

Environment variables (target — validated via `@t/config` once that lands):

| Variable | Used by | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `<ClerkProvider>`, `middleware.ts` | — (required) |
| `CLERK_SECRET_KEY` | server-side calls into `@clerk/nextjs/server` (`auth()`, `currentUser()`), Clerk Backend API | — (required, server-only) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk redirect target | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk redirect target | `/sign-up` |
| `NEXT_PUBLIC_TRPC_URL` | `lib/trpc/provider.tsx` | `http://localhost:3001/trpc` |

Key runtime deps (`package.json`, target):

| Package | Role |
| --- | --- |
| `next@^15` / `react@^19` / `react-dom@^19` | App Router + RSC runtime |
| `@clerk/nextjs@^7.2.3` | Session provider, `<SignIn />` / `<SignUp />` / `<UserButton />`, `clerkMiddleware`, server helpers (`auth()`, `redirectToSignIn()`) |
| `@trpc/client@^11` / `@trpc/react-query@^11` / `@trpc/server@^11` | Typed client → `apps/api` |
| `@tanstack/react-query@^5.59` | Query cache / suspense integration |
| `tailwindcss@^4` / `@tailwindcss/postcss@^4` | Styling |
| `@t/api` (workspace) | Type-only `AppRouter` import |
| `@playwright/test@^1.59` | e2e harness |

---

## Bootstrap Status

Mirrors the `apps/web` slice of [root ARCHITECTURE.md § Long-Term
Progress](../ARCHITECTURE.md#long-term-progress). Last updated 2026-04-25.

- [x] Next.js 15 App Router + RSC
- [x] Tailwind v4 + Shadcn/ui dependencies
- [x] tRPC client wired (`src/lib/trpc/`)
- [x] Playwright scaffold (`apps/web/e2e/`, `playwright.config.ts`)
- [x] `@clerk/nextjs` wired (2026-04-25): `<ClerkProvider>` in root layout, `clerkMiddleware()` in
  `middleware.ts`, `/sign-in/[[...sign-in]]` + `/sign-up/[[...sign-up]]` catch-all routes.
  (`<UserButton />` placement in header still TBD as part of dashboard chrome.)
- [x] tRPC provider injects `Authorization: Bearer ${await getToken()}` header via `useAuth()` from
  `@clerk/nextjs` (2026-04-25).
- [x] RSC dashboard route uses `await auth()` + `redirectToSignIn()` from `@clerk/nextjs/server`
  (2026-04-25).
- [ ] Auth UI backed by `@t/auth` port on the server side (port calls `@clerk/backend` from
  `apps/api`; RSC and middleware use `@clerk/nextjs` directly since the SDK *is* the server helper).
  `apps/api` middleware integration still pending.
- [ ] Shadcn components actually generated under `src/components/ui/`
- [x] Server-side analytics resolved via `@t/analytics` (`posthog-node`) in DI container
  `src/lib/composition.ts` (2026-04-25). Browser-side `posthog-js` provider + Clerk-`userId`
  `identify()` still pending — `@t/analytics` is node-only by design.
- [ ] Error boundary wired to a browser-safe logger. `@t/logging` is Winston-based (node only);
  `@t/errors` ships only the Hono `errorHandler` (no React `ErrorBoundary` export). Boundaries
  depend on a separate browser adapter.
- [x] Middleware gates protected routes via `clerkMiddleware()` (2026-04-25). `createRouteMatcher` +
  explicit `auth().protect()` for additional protected paths still optional follow-up.
- [ ] Env validation via `@t/config` on the client side (no silent fallbacks for
  `NEXT_PUBLIC_TRPC_URL`). Server side resolves config through DI in `composition.ts`.
- [ ] `@t/db` dep removed from web (declared but unused; `transpilePackages` still lists it).
- [x] Playwright covers `/`, `/sign-in`, `/sign-up`, and signed-out `/dashboard` redirect
  (2026-04-25; auth-required specs gated on `CLERK_PUBLISHABLE_KEY`). Full Clerk-test-token
  signed-in flow still pending.
- [x] Playwright title regex + baseURL port reconciled (2026-04-25 — `home.spec.ts` matches
  `/Template Web App/`; `webServer` and `baseURL` both on `:3000`).
- [ ] Platform SDK placeholders resolved (ai / notifications / billing TODOs in `trpc/client.ts`,
  `trpc/provider.tsx`, `dashboard/page.tsx`).

---

## Open Items

Stubs and gaps in-source as of 2026-04-25:

- **Platform SDK placeholders.** `src/lib/trpc/client.ts`, `src/lib/trpc/provider.tsx`, and
  `src/app/dashboard/page.tsx` may still carry `TODO: import from @nutraforgetechnologies/...`
  comments for `ai`, `notifications`, and `billing` — none of those packages exist yet.
- **Browser-side observability missing.** `@t/logging` (Winston) and `@t/analytics` (`posthog-node`)
  are server-only — both wired through DI in `src/lib/composition.ts` for RSC code paths.
  Client-side analytics + error boundaries need a separate browser adapter (`posthog-js` for
  tracking; a Clerk-aware boundary that captures via `posthog-js` for errors). `@t/errors` ships
  only Hono `errorHandler` today; no React boundary export exists.
- **No `error.tsx` / `global-error.tsx`.** Next App Router expects per-segment + root error
  boundaries for production. Blocked on a browser-safe logging adapter.
- **Client config still raw `process.env`.** `trpc/provider.tsx` reads `NEXT_PUBLIC_TRPC_URL` with a
  `?? 'http://localhost:3001/trpc'` fallback. Server side already routes through `@t/config` in DI;
  client-safe schema port is the remaining work.
- **Port reconciled.** Dev / Playwright / `webServer` all on `:3000`. The monorepo doc still
  mentions `:3001` for web SSR — clarify or update `railway.toml` (single source).
- **Shadcn/ui not actually installed.** `components.json` is present and deps include
  `class-variance-authority`, `clsx`, `tailwind-merge`, but no `src/components/ui/` directory
  exists. No components have been generated.
- **Dashboard is a placeholder.** Renders only a heading + "Signed in as user {userId}"; no tRPC
  calls, no data fetching, no billing panel.
- **`@t/db` declared but unused.** Listed in `dependencies` and `transpilePackages` for `apps/web`.
  RSC direct DB access is an anti-pattern in this architecture; web goes through tRPC. Either drop
  the dep or keep it for type-only references.
- **`apps/api` Clerk middleware integration landed 2026-04-26.** `apps/web` is fully on Clerk;
  `apps/api`'s Hono `clerkAuth` middleware (`apps/api/src/middleware/clerkAuth.ts`) and
  `/api/webhooks/clerk` route (`apps/api/src/routes/webhooks/clerk.ts`) are wired. End-to-end Clerk
  flow web → api is now operational.
