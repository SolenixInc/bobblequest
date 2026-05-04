---
paths:
  - "bunfig.toml"
  - "**/bunfig.toml"
---

# Root `bunfig.toml` invariants

**Applies to:** root and any nested `bunfig.toml` in this repo.

## Required keys (`[install]`)

- `linker = "hoisted"` — REQUIRED. Bun 1.3.0 changed the default to `"isolated"`, which silently breaks Next.js, Electron, and Expo workspaces in this monorepo. Never remove or change this.
- `saveTextLockfile = true` — REQUIRED. Repo commits the JSONC text lockfile (`bun.lock`), never the binary `bun.lockb`.
- `concurrentScripts = 4` — REQUIRED on Windows hosts. Mitigates EPERM/EBUSY during install. Do NOT raise on Windows; raising is acceptable only on Linux/macOS forks.

## Required keys (`[run]`)

- `shell = "bun"` — REQUIRED. Avoids `cmd.exe` quoting issues on Windows. Do not change.

## Forbidden in committed `bunfig.toml`

- `frozenLockfile`, `dryRun`, `ignoreScripts`, `production` — CI-only flags or footguns. If needed for CI, pass via env or flag at the call site, never commit.
- `ignoreScripts = true` specifically also breaks `trustedDependencies` lifecycle (see `trusted-dependencies.md`).

## Schema discipline

- Bun emits `warn: Unrecognized option in bunfig.toml` on invalid keys but does NOT fail. Treat any such warning as a tracked work item — fix on sight.
- NEVER use these bare keys (not in the schema): `workspace`, `lockfile`, `cache`, `[pm]`, `backend`. They produce non-fatal warnings and indicate stale config.

Reason: Verified Bun 1.3.11, RTFM-checked 2026-04-27. Drift here causes silent install/runtime breakage that masquerades as application bugs.
