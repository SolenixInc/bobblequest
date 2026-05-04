# Verification

## What this file is for

Documents the stack verification system for the template monorepo. The
`bun run doctor` command runs a 6-phase pipeline that checks every app's
bootstrap health and renders a green/red matrix. Covers running modes,
phase matrix, adding new apps, docker stack commands, and required env vars.

## When to update it

- A new verification phase is added or removed
- A new app is added to the doctor matrix
- Docker stack service list or healthcheck contract changes
- Required env vars change

## Running

```sh
# Full verification (all phases)
bun run doctor

# Fast mode (skip env audit)
bun run doctor --fast

# CI mode (skip mobile/desktop boot probes)
bun run doctor --ci --fast

# Single app
bun run doctor --filter=api

# Single phase
bun run doctor --phase=3
```

## What it checks

| Phase | Check | Fast? | CI? |
| --- | --- | --- | --- |
| 1 | Install graph health | yes | yes |
| 2 | Typecheck per package | no | no |
| 3 | Lint per package | no | no |
| 4 | Unit tests + coverage | no | no |
| 5 | Build per app | no | no |
| 6 | Live boot + HTTP /bootstrap probe | no | skips mobile/desktop |

## Interpreting the matrix

The final phase prints an ASCII matrix:

```text
┌─────────┬──────┬──────┬───────┬──────┬──────┐
│ Package │ Type │ Env  │ Check │ Test │ Boot │
├─────────┼──────┼──────┼───────┼──────┼──────┤
│ api     │  ✓   │  ✓   │   ✓   │  ✓   │  ✓   │
│ web     │  ✓   │  ·   │   ✓   │  ✓   │  ✓   │
│ website │  ✓   │  ·   │   ✓   │  ✓   │  ✓   │
│ mobile  │  ✓   │  ·   │   ✓   │  ✓   │  ·   │
│ desktop │  ✓   │  ·   │   ✓   │  ✓   │  ·   │
└─────────┴──────┴──────┴───────┴──────┴──────┘
```

- `✓` = passed
- `✗` = failed
- `·` = skipped or not applicable (e.g., no env file found for web in template scaffold)

## Adding a new app

1. Add an entry to `scripts/doctor/apps.ts` with the app's name, kind,
   start command, port, and probe path.
2. Ensure the app has a `/bootstrap` endpoint or page that returns a
   JSON-script payload.
3. Add the app's `Dockerfile` to the repo root docker-compose.yml.
4. Run `bun run doctor --filter=<app-name>` to verify.

## Docker stack

Services: `db` (postgres), `redis`, `api`, `web`, `website`.

```sh
bun run stack:up      # Start all services
bun run stack:logs    # Tail logs
bun run stack:down    # Stop all services
bun run stack:rebuild # Rebuild images and restart
```

Each container has a healthcheck against its `/bootstrap` endpoint.

## Full local stack (`stack:full`)

Boots the entire local environment — docker services, mobile (Expo), and
desktop (Electron) — in a single command and tears everything down cleanly
on SIGINT.

```sh
bun run stack:full           # Full stack: docker + mobile + desktop
bun run stack:full:nodocker  # Skip docker compose; assume services already up
bun run stack:full:apionly   # Docker services only; no mobile/desktop host processes
```

**6 phases:**

| Phase | Name | What happens |
| --- | --- | --- |
| 1 | Preflight | Env var check; auto-generates `.env.docker` from `.env.docker.example` if missing |
| 2 | Compose up | `docker compose up -d`; waits for all container healthchecks to pass |
| 3 | Host app spawn | Spawns mobile (Expo) and desktop (Electron) host processes |
| 4 | Ready polling | Polls `/bootstrap` on each service until ready or timeout |
| 5 | Doctor matrix | Renders the green/red readiness matrix (same format as `bun run doctor`) |
| 6 | Idle / teardown | Process idles; SIGINT triggers ordered teardown (host processes → compose down) |

Script: `scripts/stack/launch.ts`.

## Env vars

Required vars in `.env.docker` (copy from `.env.docker.example`):

- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` / `REDIS_PASSWORD` — Redis connection
- Clerk keys (`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, etc.)
- RevenueCat keys (`REVENUECAT_*`, `NEXT_PUBLIC_REVENUECAT_*`, `VITE_REVENUECAT_*`)

Consumer projects wire their own values. No SMTP, S3, or Minio vars are
required — Clerk handles auth (no SMTP needed) and no S3 SDK consumers exist.

## Out of scope

- Live mobile/desktop CI runners (stubbed with `--live` flag for future).
- Production deployment (use Railway or your preferred platform).

---

_Last reviewed: 2026-04-28 — owner: TBD_
