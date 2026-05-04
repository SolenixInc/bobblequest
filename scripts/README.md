# scripts/

Repo-wide developer tooling. Everything here is TypeScript executed directly by Bun — no
compile step, no dist folder.

There are two main tools:

- **doctor** — probes every app and service and prints a health matrix.
- **stack** — one-command launcher that boots Docker, runs migrations, starts all host
  processes, polls readiness, then idles until you hit Ctrl-C.

---

## Doctor

The doctor checks whether each app in the monorepo is reachable and healthy.

```bash
bun run doctor
```

It reads the app registry in `scripts/doctor/apps.ts`. Each entry declares a name, port,
dev command, HTTP probe URL, and a `readyMatcher` regexp. Apps whose `cwd` does not exist
on disk are silently skipped (so mobile/desktop probes do not crash on stripped-down
environments).

To add or remove an app from the probe matrix, edit `scripts/doctor/apps.ts` — everything
else is table-driven.

---

## Stack orchestrator

### Starting the full stack

```bash
bun run up
```

This is an alias for `bun run stack:full`, which runs
`scripts/stack/launch.ts`. It goes through seven phases:

```
Phase 1    Pre-flight       — verify docker + docker-compose on PATH; warn on missing .env.docker
Phase 2    Compose up       — docker compose up -d --wait (healthchecks included)
Phase 2.5  DB migrations    — drizzle-kit migrate against localhost:5432; aborts on failure
Phase 3    Host apps        — spawn Expo (mobile) + Electron (desktop) in parallel
Phase 4    Readiness        — poll api, web, website endpoints for HTTP 200
Phase 5    Doctor matrix    — bun run doctor --filter=api,web,website
Phase 5.5  Open surfaces    — open browser tabs; confirm desktop PID
Phase 6    Idle             — print status box; wait for SIGINT/SIGTERM
Phase 7    Teardown         — kill host procs + docker compose down
```

### Live heartbeat and per-endpoint readiness ticks

During Phase 4 (readiness polling) the stack prints a live status ticker to the terminal.
On an interactive TTY the ticker overwrites the current line so your scroll history stays
clean. In CI or piped output it emits one line per tick so the full history is captured in
logs. Each endpoint reports its own tick so you can see which service is still coming up.

### Flags

Pass flags directly after `bun run up` (or `bun run stack:full`):

```
--no-mobile      Skip Expo host process
--no-desktop     Skip Electron host process
--no-docker      Skip docker compose phase (infra already running)
--no-open        Skip browser-open phase
--open=<csv>     Open only the named surfaces: website,web,api,mobile,desktop
--quiet          Suppress per-service log streaming (status-only output)
--no-matrix      Skip doctor matrix render at the end
```

Common combos:

```bash
# API + web only, no mobile/desktop
bun run stack:full:apionly

# Apps only (Docker infra already up)
bun run stack:full:nodocker
```

### Stopping the stack

```bash
# Graceful: kill PID-tracked processes + compose down
bun run stack:down

# Remove Docker volumes as well
bun run stack:clean

# Nuclear: remove volumes + networks + images
bun run stack:nuke
```

### Other stack commands

```bash
bun run stack:logs       # docker compose logs -f
bun run stack:dev        # docker compose watch (live reload for Docker services)
bun run stack:rebuild    # rebuild images from scratch + compose up
```

---

## Adding a new script

1. Create `scripts/<name>.ts` (top-level glue) or `scripts/<tool>/<name>.ts` (part of an
   existing tool group).
2. Keep the file focused on one concern (SRP). If it grows beyond ~150 lines, split it.
3. Register it in the root `package.json` `"scripts"` block:
   ```json
   "my-script": "bun run scripts/my-script.ts"
   ```
4. If the script has unit tests, place them in `scripts/<tool>/__tests__/` and ensure
   the package's `vitest.config.ts` covers the new file.
5. If the script registers a new app or service, update `scripts/doctor/apps.ts`
   (doctor) or `scripts/stack/services.ts` (stack) rather than hard-coding names.

---

## Running the stack tests

The `scripts/stack/` package uses Vitest (not Bun test). Run from the repo root:

```bash
bun run test --filter=@t/stack-scripts
```

Or from inside `scripts/stack/`:

```bash
bun run test
```

---

## For agents

See `C:\Users\jager\OneDrive\Documents\GitHub\template-repo\scripts\AGENTS.md` for the
terse structural reference: layout, entry points, invocation patterns, and conventions
(including the LEFTHOOK_EXCLUDE / `--no-verify` prohibition).
