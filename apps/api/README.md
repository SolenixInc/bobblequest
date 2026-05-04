# apps/api

Bun-native HTTP server and DI composition root for the backend. Hono handles CORS, health probes, and raw-body webhook routes; `@hono/trpc-server` mounts the tRPC router at `/trpc/*`. Exports `AppRouter` as the `@t/api` package, consumed as a typed client by `apps/web`, `apps/website`, `apps/mobile`, and `apps/desktop`. Runs as three independent Railway services in production: HTTP (`src/index.ts`), Worker (`src/worker.ts`), Cron (`src/cron.ts`).

## Run it

```bash
bun run --filter @t/api dev    # standalone (requires Postgres + Redis running)
bun run dev                    # full stack: this app + others + Postgres + Redis + Mailpit + MinIO
```

Local URL: http://localhost:3000
Health check: http://localhost:3000/bootstrap (also: `/health`)

## Tech

- Hono 4.12.16 (HTTP server)
- tRPC 11 (typed RPC over HTTP) — `AppRouter` shared with all clients
- Clerk (`@clerk/backend` JWT verification middleware)
- Drizzle ORM + Postgres (via `@t/db`)
- Redis (cache via `@t/cache`, queue via `@t/queue`)
- Svix (webhook signature verification)
- Zod (input validation on every boundary)

## Entry points

- `src/index.ts` — HTTP server boot, middleware wiring
- `src/composition.ts` — DI container assembly (single composition root)
- `src/routers/index.ts` — `AppRouter` export (the `@t/api` public contract)
- `src/trpc/index.ts` — tRPC init, `protectedProcedure` / `adminProcedure`
- `src/middleware/clerkAuth.ts` — Clerk JWT middleware
- `src/worker.ts` — background job worker entrypoint
- `src/cron.ts` — scheduled job entrypoint

## Configuration

Env vars: see `../../docs/reference/env-vars.md` (filtered to the API section).
App-specific .env: `./.env` (template at `./.env.example`).
All config flows through `ConfigRepository` (`ctx.config`) — never `process.env` inside routers.

## Deeper reading

- Agent rules: `./AGENTS.md`
- Backend architecture: `../../docs/architecture/platform/` (config, auth, db, cache, queue, dependency-injection)
