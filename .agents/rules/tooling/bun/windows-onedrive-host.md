---
paths:
  - "bunfig.toml"
  - "package.json"
  - ".gitignore"
---

# Windows + OneDrive host environment

**Applies to:** contributors cloning or running this repo on Windows hosts.

## Known-bad host path

This repo is currently checked out under `C:\Users\<user>\OneDrive\Documents\GitHub\` for the maintainer. OneDrive sync + Windows Defender realtime scan against `node_modules/` cause:

- Intermittent `copyfile` fallback (logged to `bun-install-copyfile.log`).
- Intermittent EPERM and EBUSY errors during `bun install`.
- Slow installs (10–60s longer per run).

## Mitigation (in order of cleanliness)

1. **Cleanest:** clone to a non-OneDrive local path (e.g., `C:\dev\template-repo`).
2. **Minimum:**
   - Exclude the project directory from OneDrive sync (right-click folder → "Free up space" / OneDrive settings).
   - Exclude `~/.bun` and `node_modules` from Windows Defender realtime scan.

## Diagnostic logs (gitignored)

- `bun-install-copyfile.log`, `bun-install.log`, `install-debug.log` — gitignored. Their reappearance indicates host setup needs attention, NOT repo config. Do not commit "fixes" to `bunfig.toml` or `package.json` for these — fix the host.

## On macOS / Linux

This rule does not apply. Native `node_modules` performance on POSIX hosts has none of these failure modes.

Reason: Verified 2026-04-27. Repo invariants assume POSIX-equivalent filesystem semantics; OneDrive is the host-layer violator, not the repo.
