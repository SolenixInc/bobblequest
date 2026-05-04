# Reference: bun scripts

> Regenerate by inspecting `package.json` files across the monorepo; this doc must match reality.
> Run `bun run <script>` from the repo root for root scripts, or
> `cd <app-or-package> && bun run <script>` for workspace scripts.
> Turbo orchestrates cross-workspace runs via `turbo run <task>`.

---

## What this file is for

Lookup table for every `package.json` script in the monorepo. One row per script per workspace.

## When to update it

Any time a `package.json` `scripts` field is added, removed, or renamed.

---

## Root scripts

Source: `package.json` (repo root)

| Script | Description |
| --- | --- |
| `prepare` | Install Lefthook git hooks (runs automatically on `bun install`). |
| `dev` | Start all workspaces in dev mode via Turbo. |
| `build` | Build all workspaces via Turbo. |
| `test` | Run all workspace test suites via Turbo. |
| `test:coverage` | Run all workspace test suites with coverage via Turbo. |
| `check` | Run Biome lint/format check across all workspaces via Turbo. |
| `lint` | Alias for `check`. |
| `typecheck` | Run `tsc --noEmit` across all workspaces via Turbo. |
| `format` | Run Biome with auto-fix writes across all workspaces via Turbo. |
| `format:check` | Run `biome ci .` at the repo root (no writes). |
| `clean` | Run `turbo clean` then delete root `node_modules`. |
| `doctor` | Run `scripts/doctor.ts` — health-check for local dev environment. |
| `stack:up` | Start Docker Compose services in detached mode. |
| `stack:down` | Tear down host services (PID files) and run soft docker cleanup: `docker compose down --remove-orphans` + `docker image prune -f` (dangling layers only; named volumes preserved). |
| `stack:clean` | Runs `stack:down` then drops named volumes (`pgdata`, `redisdata`), build cache (`docker builder prune -f`), and all images labeled `com.template-repo.managed=true`. Use after finishing an iteration to reclaim significant disk. |
| `stack:nuke` | Runs `stack:clean` then `docker system prune -af --volumes` — wipes **all** Docker resources on the host (not just template-repo's). Requires interactive confirmation (pass `--force` flag to skip, e.g. in CI). Use to reclaim 10s of GB after heavy build cycles. |
| `stack:logs` | Tail Docker Compose service logs. |
| `stack:dev` | Start Docker Compose in watch mode (live-sync). |
| `stack:rebuild` | Force-rebuild Docker images then start services. |
| `stack:full` | Full local stack launch via `scripts/stack/launch.ts`. |
| `stack:full:nodocker` | Full local stack launch without starting Docker services. |
| `stack:full:apionly` | Full local stack launch without mobile or desktop apps. |
| `up` | Alias for `stack:full`. |

### stack:full flags

| Flag | Description |
| --- | --- |
| `--no-mobile` | Skip Expo (mobile) host process. |
| `--no-desktop` | Skip Electron (desktop) host process. |
| `--no-docker` | Skip docker compose (already running or native mode). |
| `--no-matrix` | Skip Phase 5 doctor matrix render. |
| `--no-open` | Skip Phase 5.5 — do not open any browser tabs. |
| `--open=<csv>` | Open only the specified surfaces (comma-separated subset of `website,web,api,mobile,desktop`). Example: `--open=website,api`. |
| `--quiet` | Suppress per-service log streaming. |
| `--help` | Print help text and exit. |

### stack:full surfaces (Phase 5.5)

Phase 5.5 runs after the doctor matrix and before the idle loop. It opens every
developer-facing surface in the browser (with a 200 ms stagger to avoid
focus-stealing) and confirms the desktop Electron window is alive.

| Surface | URL | Notes |
| --- | --- | --- |
| `website` | <http://localhost:3002> | Next.js marketing website app. |
| `web` | <http://localhost:3001> | Next.js web app. |
| `api` | <http://localhost:3000/bootstrap> | API bootstrap probe page. No OpenAPI/Swagger UI or tRPC panel is currently mounted — `/bootstrap` is the only human-reachable page. Follow-up: mount a tRPC panel at `/panel`. |
| `mobile` | <http://localhost:8081> | Metro bundler web UI — shows the Expo Go QR code. The `bunx expo start` process also prints the QR directly to stdout. |
| `desktop` | (no URL) | Electron window spawned by `electron-vite dev`. Phase 5.5 checks that the desktop PID (`.stack/pids/desktop.pid`) is alive and logs the result; it does not open a browser tab. |

Phase 5.5 is best-effort: a failure to open one surface logs a warning and
continues to the next — it never aborts the launcher.

Phase 5.5 is automatically skipped when the `CI` environment variable is set.

---

## App scripts

### apps/api

Source: `apps/api/package.json` (`@t/api`)

| Script | Description |
| --- | --- |
| `dev` | Run the API server with hot-reload via `bun --hot`. Loads `.env` from the repo root and `apps/api/.env`. |
| `build` | Bundle `src/index.ts` to `dist/` targeting Node. |
| `start` | Run the production bundle (`dist/index.js`). |
| `worker` | Run the background job worker (`src/worker.ts`). |
| `worker:dev` | Run the background job worker with watch-mode reload. |
| `cron` | Run the cron runner (`src/cron.ts`). |
| `check` | Run Biome lint/format check (no writes). |
| `format` | Run Biome with auto-fix writes. |
| `typecheck` | Run `tsc --noEmit`. |
| `test` | Run Vitest in CI mode (single pass). |
| `test:watch` | Run Vitest in interactive watch mode. |
| `test:coverage` | Run Vitest with V8 coverage report. |
| `size` | Run `size-limit` bundle-size check against `dist/index.js`. |

### apps/web

Source: `apps/web/package.json` (`@t/web`)

| Script | Description |
| --- | --- |
| `dev` | Start Next.js dev server on port 3001. |
| `build` | Build Next.js for production. |
| `start` | Start the Next.js production server. |
| `check` | Run Biome lint/format check (no writes). |
| `format` | Run Biome with auto-fix writes. |
| `typecheck` | Run `tsc --noEmit`. |
| `test` | Run Vitest in CI mode. |
| `test:watch` | Run Vitest in interactive watch mode. |
| `test:coverage` | Run Vitest with V8 coverage report. |
| `test:e2e` | Run Playwright end-to-end tests. |
| `size` | Run `size-limit` bundle-size check against `.next/static/**/*.js`. |

### apps/website

Source: `apps/website/package.json` (`@t/website`)

| Script | Description |
| --- | --- |
| `dev` | Start Next.js dev server on port 3002 with Turbopack. |
| `build` | Build Next.js for production. |
| `start` | Start the Next.js production server on port 3002. |
| `check` | Run Biome lint/format check (no writes). |
| `format` | Run Biome with auto-fix writes. |
| `typecheck` | Run `tsc --noEmit`. |
| `test` | Run Vitest in CI mode. |
| `test:watch` | Run Vitest in interactive watch mode. |
| `test:coverage` | Run Vitest with V8 coverage report. |
| `test:e2e` | Run Playwright end-to-end tests (headless). |
| `test:e2e:ui` | Run Playwright end-to-end tests with the Playwright UI. |

### apps/mobile

Source: `apps/mobile/package.json` (`@t/mobile`)

| Script | Description |
| --- | --- |
| `dev` | Start the Expo dev server (platform-chooser in terminal). |
| `android` | Start the Expo dev server targeting Android. |
| `ios` | Start the Expo dev server targeting iOS Simulator. |
| `web` | Start the Expo dev server targeting web (experimental). |
| `check` | Run Biome lint/format check (no writes). |
| `format` | Run Biome with auto-fix writes. |
| `typecheck` | Run `tsc --noEmit`. |
| `test` | Run Vitest in CI mode. |
| `test:watch` | Run Vitest in interactive watch mode. |
| `test:coverage` | Run Vitest with V8 coverage report. |

### apps/desktop

Source: `apps/desktop/package.json` (`@t/desktop`)

| Script | Description |
| --- | --- |
| `dev` | Start Electron + Vite dev server with HMR via `electron-vite dev`. |
| `build` | Build main, preload, and renderer via `electron-vite build`. |
| `start` | Preview the production build via `electron-vite preview`. |
| `preview` | Alias for `start`. |
| `pack` | Package the app into a directory without creating an installer. |
| `dist` | Package and create platform installers via `electron-builder`. |
| `check` | Run Biome lint/format check (no writes). |
| `format` | Run Biome with auto-fix writes. |
| `typecheck` | Run `tsc --noEmit`. |
| `test` | Run Vitest in CI mode. |
| `test:watch` | Run Vitest in interactive watch mode. |
| `test:coverage` | Run Vitest with V8 coverage report. |

---

## Package scripts

### packages/db

Source: `packages/db/package.json` (`@t/db`)

| Script | Description |
| --- | --- |
| `check` | Run Biome lint/format check (no writes). |
| `format` | Run Biome with auto-fix writes. |
| `typecheck` | Run `tsc --noEmit`. |
| `test` | Run Vitest in CI mode. |
| `test:watch` | Run Vitest in interactive watch mode. |
| `test:coverage` | Run Vitest with V8 coverage report. |
| `test:integration` | Run Vitest against `vitest.integration.config.ts` (requires live DB). |
| `db:test:up` | Start the test Postgres container via `docker-compose.db.yml`. |
| `db:test:down` | Stop and remove the test Postgres container. |
| `db:generate` | Generate Drizzle migration files from the schema. |
| `db:migrate` | Apply pending Drizzle migrations to the database. |
| `db:push` | Push schema changes directly to the DB (no migration file). |
| `db:studio` | Open Drizzle Studio (local DB browser). |

### packages/config

Source: `packages/config/package.json` (`@t/config`)

| Script | Description |
| --- | --- |
| `typecheck` | Run `tsc --noEmit`. |
| `check` | Run Biome lint/format check (no writes). |
| `format` | Run Biome with auto-fix writes. |
| `test` | Run Vitest in CI mode. |
| `test:watch` | Run Vitest in interactive watch mode. |
| `test:coverage` | Run Vitest with V8 coverage report. |

### Other packages

Other packages (e.g., `@t/errors`, `@t/logging`, `@t/auth`, `@t/analytics`, etc.) follow the
same Turbo-aligned subset: `check`, `format`, `typecheck`, `test`, `test:watch`,
`test:coverage`. Consult each package's `package.json` for the exact set.

---

## Convention

Scripts must follow Turbo task naming to appear in the pipeline graph:

| Task | Required | Purpose |
| --- | --- | --- |
| `dev` | apps | Start local dev server or process. |
| `build` | apps + lib packages | Compile or bundle for production. |
| `check` | all | Lint and format check (read-only). |
| `typecheck` | all | TypeScript type-check (no emit). |
| `test` | all | Unit and integration tests (CI mode). |
| `test:coverage` | all | Tests with coverage report. |
| `format` | all | Lint and format with writes. |

Per-app extras allowed: `start`, `worker`, `worker:dev`, `cron`, `migrate`, `seed`,
`db:generate`, `db:migrate`, `db:push`, `db:studio`, `pack`, `dist`, `android`, `ios`,
`test:e2e`, `test:e2e:ui`.

---

**Last reviewed:** 2026-04-29 — owner: TBD
