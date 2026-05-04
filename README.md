# {{PROJECT_NAME}} Template

Internal scaffold for cloning into new `<ORGANIZATION-NAME>` projects.

> **Is this the repo you want?**
> This is `template-repo`. If you are starting a NEW project, clone this and rename it.
> If you are trying to contribute to an EXISTING project that was cloned from this template,
> you are in the wrong place — go to that project's repo instead.
>
> **This repo is internal-only.** No public OSS framing. See [NOTICE.md](./NOTICE.md) and
> [SECURITY.md](./SECURITY.md).
> **Copying this template?** Start with [`USING_THIS_TEMPLATE.md`](USING_THIS_TEMPLATE.md) —
> 30-minute orientation, placeholder map, and required-accounts checklist.

## Where to go next

- [Onboarding](./ONBOARDING.md) — Day 1 / Week 1 / Week 2 ramp
- [Documentation hub](./docs/index.md) — Diátaxis-organized docs
- [prd-status](./docs/prd-status/README.md) — concern x app readiness matrix
- [Local-dev port map](./docs/reference/ports-and-services.md)
- [Release flow](./docs/how-to/cut-a-release.md) — Conventional Commits drive automated releases via
  release-please
- [Contributing — releases & CI Gate](./docs/contributing/releases.md) — merge strategy, PR title
  rules, and the verify-job check matrix

Production-ready monorepo template. Clone, install, start. Everything here is functional — not a
skeleton.

## Quick start

```bash
bun install
bun run dev
```

`bun run dev` boots the entire stack from a single command: Docker (api, web, website, db, redis)
comes up, Drizzle migrations run, mobile + desktop spawn as host processes with prefixed log
streams, HTTP readiness is polled, and browser tabs auto-open for website / web / api.

Flags (forward via `bun run dev -- <flag>` — the `--` is required):

- `--no-docker` — skip docker compose + migrations (host-only iteration)
- `--no-open` — skip browser auto-open
- `--no-mobile` / `--no-desktop` — skip those host apps
- `--open=<csv>` — limit auto-open to a comma-separated allowlist (e.g. `--open=website,web`)
- `bun run dev:packages` — old turbo-only behavior (no Docker, no auto-open, package iteration)

## Detailed setup

```bash
# Clone the repo
git clone {{REPO_URL}}
cd {{PROJECT_DIR}}

# Install dependencies
bun install

# Copy and fill in environment variables
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# One-command full stack (Docker + migrations + all 5 apps)
bun run dev
```

`bun run dev` (alias: `bun run up` / `stack:full`):

1. Starts Postgres 17 + Redis 8 via Docker Compose (waits for healthchecks)

2. Runs Drizzle migrations automatically (`@t/db db:migrate` against `localhost:5433`)
3. Spawns all 5 apps — api, web, website, mobile (Expo), desktop (Electron)
4. Polls `/bootstrap` endpoints until the API and web are ready
5. Auto-opens browser tabs for website / web / api
6. Prints a status box; press Ctrl+C to tear down everything

For manual control (Turbo dev without docker / auto-open):

```bash
# Start local Postgres first, then:
bun run --filter @t/db db:migrate
bun run dev:packages
```

All five apps boot simultaneously via Turbo:

| App | Port | Description |
| --- | --- | --- |
| **api** | `3000` | tRPC + Hono server |
| **web** | `3001` | Next.js web app — product UI, auth |
| **website** | `3002` | Marketing + blog (Next.js) |
| **mobile** | tunnel | Expo on LAN (`bun run --filter @t/mobile dev`) |
| **desktop** | n/a | Electron (`bun run --filter @t/desktop dev`) |

## Project Structure

```text
{{PROJECT_DIR}}/
├── apps/
│   ├── api/         # tRPC + Hono API server (port 3000)
│   ├── web/         # Next.js web app — product UI, auth (port 3001)
│   ├── website/     # Next.js marketing site — landing, blog/MDX (port 3002)
│   ├── mobile/      # Expo + React Native + NativeWind
│   └── desktop/     # Electron + electron-vite
├── packages/
│   ├── analytics/              # PostHog node analytics tracker
│   ├── analytics-browser/        # PostHog browser analytics adapter
│   ├── analytics-rn/             # PostHog React Native analytics adapter
│   ├── analytics-types/          # Shared analytics type contracts
│   ├── auth/                     # Clerk auth provider scaffold
│   ├── billing/                  # RevenueCat + Stripe billing domain
│   ├── billing-browser/          # RevenueCat Web SDK wrapper
│   ├── cache/                    # Redis cache port + impl + helpers
│   ├── config/                   # Runtime config schemas + repository
│   ├── db/                       # Drizzle ORM client, schema, migrations, Zod schemas
│   ├── dependency-injection/     # DI container + global token registry
│   ├── errors/                   # Domain errors, response transformers, Hono errorHandler
│   ├── logging/                  # Winston + PostHog OTLP logger
│   ├── logging-browser/          # Browser-safe logger adapter
│   ├── logging-rn/               # React Native logger adapter
│   └── logging-types/            # Shared logger type contracts
├── docs/
│   └── packages/
│       └── INDEX.md              # Full package reference
├── railway.toml     # Railway service definitions (api, web, website)
├── turbo.json       # Turborepo task pipeline
└── .env.example     # Required env vars template
```

## Packages

See [docs/packages/INDEX.md](docs/packages/INDEX.md) for the full package listing with one-line
purposes.

## Commands

| Command | Description |
| --- | --- |
| `bun install` | Install all workspace dependencies |
| `bun run dev` | One-command full stack — Docker + migrations + all apps + auto-open browsers |
| `bun run dev:packages` | Turbo-only dev (no Docker, no auto-open) — package iteration |
| `bun run build` | Build all apps and packages |
| `bun run check` | Biome lint check |
| `bun run format` | Biome auto-format |
| `bun run typecheck` | TypeScript strict check |

## Local pre-commit gate

Lefthook auto-installs hooks when you run `bun install` (via the `prepare` script). No manual setup
needed.

The pre-commit hook runs all checks in parallel and mirrors the CI fast tier:

| Check | Tool | Scope |
| --- | --- | --- |
| Format | Biome | Staged `.ts/.tsx/.js/.jsx/.json/.md/.yml` |
| Lint | Biome | Staged `.ts/.tsx/.js/.jsx` |
| Typecheck | Turbo + tsc | Packages affected by staged diff |
| Tests | Turbo + Vitest | Packages affected by staged diff |
| Secret scan | gitleaks | Staged changes only |

The commit-msg hook enforces [Conventional Commits](https://www.conventionalcommits.org/) via
commitlint.

**Secret scan (optional):** The local hook gracefully skips when `gitleaks` is not installed. CI
always runs the full scan, so local install is a dev convenience only.

| Platform | Install |
| --- | --- |
| macOS | `brew install gitleaks` |
| Windows | `winget install gitleaks` or `scoop install gitleaks` |
| Linux | Download from <https://github.com/gitleaks/gitleaks/releases> and place on `PATH` |

**Emergency bypass** (use sparingly): `LEFTHOOK=0 git commit ...`

**Timing:** Expect 5-30 seconds per commit on changes touching multiple packages — all checks run
concurrently. If hooks pass locally, the CI fast tier will also pass.

## Apps

### api (port 3000)

`tRPC + Hono` server. All other apps are clients. Exposes `AppRouter` type via `@t/api`.

### web (port 3001)

`Next.js 15 App Router`. Auth via Clerk (`@clerk/nextjs`). tRPC client. Landing page + dashboard.

### website (port 3002)

`Next.js 15 App Router`. Marketing site + MDX blog. No auth. `/api/health` endpoint.

### mobile

`Expo SDK 54 + NativeWind`. Clerk (`@clerk/clerk-expo`) with `expo-secure-store` token cache. tRPC
client. Auth tab + dashboard tab.

### desktop

`electron-vite + React`. Auth via Clerk (`@clerk/clerk-react`). tRPC client. BrowserWindow with
login/dashboard.

## Platform SDK

AI, billing, and notifications are not wired in this template — each app has `TODO` comments at
AI/billing/notifications integration points where the consuming project wires its own SDK.

## Configuration

### Clerk

1. Create an application at [clerk.com](https://clerk.com)
2. Copy the publishable key and secret key into `.env`
3. Configure allowed redirect URLs per app (web / mobile / desktop)

### Database (Postgres + Drizzle)

1. Provision a Postgres instance (Railway, Neon, Supabase, or local Docker)
2. Set `DATABASE_URL` in `.env` (local: `postgresql://postgres:postgres@localhost:5433/template`)
3. Run migrations with `bun run --filter @t/db db:migrate`

When using `bun run dev` (full local stack), migrations run automatically after
Docker Postgres becomes healthy — no manual step needed.

### Railway

1. Create a project at [railway.app](https://railway.app)
2. Connect your GitHub repo — Railway auto-detects `railway.toml`
3. Set env vars in Railway dashboard

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Web / Website**: [Next.js 15](https://nextjs.org) (App Router)
- **Mobile**: [React Native](https://reactnative.dev) + [Expo SDK 54](https://expo.dev)
- **Desktop**: [Electron](https://www.electronjs.org) + [electron-vite](https://electron-vite.org)
- **API**: [tRPC](https://trpc.io) + [Hono](https://hono.dev)
- **Auth**: [Clerk](https://clerk.com) (web + mobile + desktop)
- **Database**: [Postgres](https://www.postgresql.org) via [Drizzle ORM](https://orm.drizzle.team)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) (web/website) + [NativeWind
  v4](https://nativewind.dev) (mobile)
- **Monorepo**: [Turborepo](https://turbo.build)
- **Linter**: [Biome](https://biomejs.dev)
- **Hosting**: [Railway](https://railway.app)

## Setup checklist

After first clone, replace these placeholders before committing:

| Placeholder | What to replace with |
| --- | --- |
| `{{REPO_URL}}` | The actual git clone URL |
| `{{PROJECT_NAME}}` | Your project's name |

| `{{PROJECT_DIR}}` | The directory name after clone |
