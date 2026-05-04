# Tutorial: getting started

## What this file is for

This tutorial walks a new contributor through spinning up the full local development stack for the
first
time. Follow it end-to-end once; after that use the how-to guides for day-to-day tasks.

## When to update it

- A required env var is added or renamed (update Step 2 and the link to
  `docs/reference/env-vars.md`)
- A new service is added to `docker-compose.yml` that is required for bootstrap
- The `stack:up` / `dev` script names change in the root `package.json`
- The minimum Bun or Docker Desktop version requirement changes

---

**Time:** 30–45 minutes
**Skill level:** Beginner

## What you will build

By the end of this tutorial you will have:

- A running local stack: API server, Next.js web app, Postgres, and Redis
- All packages installed and TypeScript compiling cleanly
- A `200 OK` response from `GET /health` confirming the API is live
- A mental map of where things live across `apps/` and `packages/`

## Prerequisites

- [Bun 1.3.11](https://bun.sh) installed — `bun --version` must print `1.3.11` or higher
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- Git installed — `git --version` should return a version string

## Step 1: clone and install

```bash
git clone <REPO-URL>
cd <REPO-NAME>
bun install
```

`bun install` reads the root `bun.lock` and installs all workspace packages in one pass. You should
see
no errors. If you see a peer-dependency warning it is safe to ignore; hard errors mean a Bun version
mismatch — re-check `bun --version`.

## Step 2: configure environment

Each app and several packages ship an `.env.example` file. Copy each one to `.env` before starting
the
stack:

```bash
cp apps/api/.env.example        apps/api/.env
cp apps/web/.env.example        apps/web/.env
cp apps/website/.env.example    apps/website/.env
cp apps/desktop/.env.example    apps/desktop/.env
cp apps/mobile/.env.example     apps/mobile/.env
```

Open each `.env` and fill in the values marked `<REQUIRED>`. The minimum set needed for bootstrap:

| Variable | Location | Why required |
| --- | --- | --- |
| `CLERK_SECRET_KEY` | `apps/api/.env` | Auth middleware — API refuses to start without it |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `apps/web/.env` | Client-side auth |
| `DATABASE_URL` | `apps/api/.env` | Postgres connection (Docker provides the DB; set to the value in `.env.example`) |
| `REDIS_URL` | `apps/api/.env` | Queue / cache (Docker provides Redis; set to the value in `.env.example`) |

For the full variable reference see [docs/reference/env-vars.md](../reference/env-vars.md).

The config layer hard-fails at boot for any missing required variable — you will get a clear error
message
naming the missing key. There are no silent fallbacks.

## Step 3: start the dev stack

Start the Docker services (Postgres + Redis) first, then bring up the app processes:

```bash
bun run stack:up
bun dev
```

`stack:up` runs `docker compose up -d` — it is idempotent and fast on subsequent runs.

`bun dev` uses Turbo to start all apps in watch mode in parallel. Wait until you see log lines from
both
`api` and `web` indicating they are listening before moving to the next step.

## Step 4: make your first request

In a new terminal:

```bash
curl http://localhost:<API-PORT>/health
```

Replace `<API-PORT>` with the value of `PORT` in `apps/api/.env` (default in `.env.example` is shown
there). You should receive:

```json
{ "status": "ok" }
```

A `200 OK` here confirms the API server is running, Postgres and Redis are reachable, and Clerk is
configured correctly.

## Step 5: tour the codebase

```text
<REPO-NAME>/
  apps/
    api/          — Hono + tRPC server (Bun runtime)
    web/          — Next.js app router (client-facing SaaS UI)
    website/      — Next.js marketing site
    mobile/       — Expo / React Native
    desktop/      — Electron
  packages/
    config/       — Zod-validated environment schemas, shared across all apps
    db/           — Drizzle ORM schema + migrations
    analytics/    — PostHog wrapper
    queue/        — BullMQ / in-memory queue abstraction
    logging/      — Pino logger factory
    (more...)
  docs/
    index.md            — doc map; start here for navigation
    prd-status/         — live status of every feature across every app
    architecture/       — ADRs and platform deep-dives
    tutorials/          — learning-oriented walkthroughs (you are here)
    how-to/             — task-oriented recipes
    reference/          — env vars, API surface, schema reference
```

Open `docs/index.md` for a full cross-linked map. `docs/prd-status/` shows what is shipped vs
in-progress
per app.

## What you learned

- The repo uses Bun 1.3.11 + Turbo end-to-end — never use npm or pnpm commands here
- `bun run stack:up` starts the Docker services; `bun dev` starts the app processes
- The config layer throws at boot for missing required env vars — fill in `.env` before starting
- `apps/` holds the runnable applications; `packages/` holds the shared libraries they consume
- `GET /health` is the canonical liveness check for the API

## Next steps

- [Tutorial: add a tRPC procedure end-to-end](./add-a-trpc-procedure.md)
- [Onboarding guide](../onboarding.md)
- [How-to guides](../how-to/)

---

_Last reviewed: 2026-04-28 — owner: TBD_
