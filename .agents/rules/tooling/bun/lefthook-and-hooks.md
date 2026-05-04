---
paths:
  - "lefthook.yml"
  - "lefthook.yaml"
  - ".lefthook.yml"
  - "package.json"
---

# Lefthook + Git hooks invariants

**Applies to:** lefthook config and the local repo `.git/config`.

## `core.hooksPath` must be unset

- `git config --local core.hooksPath` MUST NOT be set in this repo.
- Lefthook 2.x refuses to install when `core.hooksPath` is overridden. Symptom: `bun install` fails with `lefthook install` exit 1 during the `prepare` script.
- Diagnostic: `git config --local --get core.hooksPath` — must return empty.
- Fix: `git config --local --unset-all core.hooksPath`, then re-run `bun install`.

## Hooks run on every commit

- `pre-commit`: secret-scan + biome format-check.
- `commit-msg`: commitlint.
- These are not optional. Never bypass.

## Forbidden bypass mechanisms

- `git commit --no-verify` — forbidden, no exceptions.
- `LEFTHOOK_EXCLUDE=...` env var — morally equivalent to `--no-verify`. Forbidden.
- Any other env or flag that skips a hook. If a hook fails, fix the underlying issue — never the hook invocation.

## `prepare` band-aids

If you see `prepare` set to anything other than `lefthook install`, that is a band-aid for a separate problem (typically `core.hooksPath` set locally). Restore `prepare` to `lefthook install` and fix the underlying cause.

Reason: Hooks are the repo's secret-leak and format-drift guardrail. Skipping them ships violations.
