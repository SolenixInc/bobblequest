# Reference: local-dev ports and services

---

## What this file is for

Lookup table for every port used in local development. One row per service. Sources of truth are
listed in the "Source" column — always prefer those over this doc when they diverge.

## When to update it

Any time a port is added, removed, or reassigned in a `package.json` script, `.env.example`,
`next.config.ts`, `vite.config.ts`, or `railway.toml`.

---

## Port map

| Service | Port | Source |
| --- | --- | --- |
| apps/api (Hono/tRPC) | 3000 | `apps/api/.env.example` → `PORT=3000`; `docker-compose.yml` maps 3000:3000 |
| apps/web (Next.js) | 3001 | `apps/web/package.json` `dev` script (`next dev --port 3001`); `docker-compose.yml` maps 3001:3000 |
| apps/website (Next.js) | 3002 | `apps/website/package.json` `dev` script (`-p 3002`); `railway.toml` `[website] port = 3002` |
| apps/mobile (Metro bundler) | 8081 | Expo default; configure via `EXPO_PACKAGER_PROXY_URL` or Metro config |
| apps/desktop (Electron renderer) | `<TBD>` | `electron-vite` assigns a random Vite port; check `apps/desktop/electron.vite.config.ts` |
| Postgres | 5433 | `docker-compose.yml` maps 5433:5432 |
| Redis | 6380 | `docker-compose.yml` maps 6380:6379 |
| AI service | 8000 | `apps/api/.env.example` `AI_SERVICE_URL=http://localhost:8000` |

---

## Services

### apps/api

Hono server exposing tRPC routes and REST webhooks (Clerk, RevenueCat, Stripe). Runs on Bun.

Start locally:

```bash
# from repo root — full stack (Docker + migrations + all apps + auto-open)
bun run dev

# turbo-only (no Docker, no auto-open) — package iteration
bun run dev:packages

# or, api only:
cd apps/api && bun run dev
```

Requires `apps/api/.env` (copy from `apps/api/.env.example`). Hard-fails at boot when any
required env var is missing — see `packages/config/entities/schemas/` for the full list.

### apps/web

Next.js 15 web client (app router). Connects to `apps/api` over tRPC at `NEXT_PUBLIC_TRPC_URL`.

Start locally:

```bash
cd apps/web && bun run dev      # port 3001
```

Requires `apps/web/.env.local` (copy from `apps/web/.env.example`).

### apps/website

Next.js 15 marketing / docs site. MDX-based blog. No auth dependency.

Start locally:

```bash
cd apps/website && bun run dev  # port 3002
```

Requires `apps/website/.env.local` (copy from `apps/website/.env.example`).

### apps/mobile (Metro)

Expo (React Native) app. Metro bundler starts on port 8081 by default.

Start locally:

```bash
cd apps/mobile && bun run dev       # interactive platform chooser
cd apps/mobile && bun run ios       # iOS Simulator
cd apps/mobile && bun run android   # Android emulator / device
```

Requires `apps/mobile/.env` (copy from `apps/mobile/.env.example`).

### apps/desktop (Electron)

Electron + Vite desktop app. The Vite dev server port is assigned dynamically by `electron-vite`.

Start locally:

```bash
cd apps/desktop && bun run dev
```

Requires `apps/desktop/.env` (copy from `apps/desktop/.env.example`).

### Postgres

`pgvector/pgvector:pg17` container. Used by `@t/db` (Drizzle ORM).

Start locally via Docker Compose:

```bash
bun run stack:up        # starts Postgres + Redis
# or just the db container:
cd packages/db && bun run db:test:up
```

Connect: `postgresql://postgres:postgres@localhost:5433/template` (defaults — set real creds via
`DATABASE_URL` in `.env`).

### Redis

`valkey/valkey:8-alpine` container. Used by `@t/cache`.

Start locally via Docker Compose:

```bash
bun run stack:up
```

Connect: `redis://default:<REDIS_PASSWORD>@localhost:6380`.

---

## Conflicts

If a port is already bound on your machine, override it with the `PORT` env var (for `apps/api`)
or the appropriate Next.js CLI flag. Document overrides in your local `.env` so they are not
committed. Example:

```bash
# apps/api/.env (local only — gitignored)
PORT=3011
```

Metro (mobile) port conflicts: set `EXPO_PACKAGER_PROXY_URL` or pass `--port <n>` to
`expo start`. Postgres and Redis conflicts: adjust the `ports:` mapping in
`docker-compose.yml` locally and update `DATABASE_URL` / `REDIS_URL` accordingly.

---

**Last reviewed:** 2026-04-30 — owner: TBD
